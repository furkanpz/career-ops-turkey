#!/usr/bin/env node

/**
 * followup-cadence.mjs — Follow-up cadence tracker for career-ops
 *
 * Parses applications.md + follow-ups.md, calculates follow-up cadence
 * for active applications, extracts contacts, and flags overdue entries.
 *
 * Run: node followup-cadence.mjs
 *      node followup-cadence.mjs --summary
 *      node followup-cadence.mjs --overdue-only
 *      node followup-cadence.mjs --applied-days 10
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { normalizeTrackerStatusGroup } from './tracker-status-utils.mjs';

const CAREER_OPS = dirname(fileURLToPath(import.meta.url));
const APPS_FILE = existsSync(join(CAREER_OPS, 'data/applications.md'))
  ? join(CAREER_OPS, 'data/applications.md')
  : join(CAREER_OPS, 'applications.md');
const FOLLOWUPS_FILE = join(CAREER_OPS, 'data/follow-ups.md');

const args = process.argv.slice(2);
const summaryMode = args.includes('--summary');
const overdueOnly = args.includes('--overdue-only');
const appliedDaysIdx = args.indexOf('--applied-days');
const APPLIED_FIRST = appliedDaysIdx !== -1 ? parseInt(args[appliedDaysIdx + 1], 10) || 7 : 7;

const CADENCE = {
  applied_first: APPLIED_FIRST,
  applied_subsequent: 7,
  applied_max_followups: 2,
  responded_initial: 1,
  responded_subsequent: 3,
  interview_thankyou: 1,
};

const ACTIONABLE_STATUSES = ['applied', 'response_received', 'interview'];
const URGENCY_ORDER = new Map([
  ['urgent', 0],
  ['overdue', 1],
  ['waiting', 2],
  ['cold', 3],
]);

function today() {
  return new Date(new Date().toISOString().split('T')[0]);
}

function parseDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())) return null;
  return new Date(`${String(dateStr).trim()}T00:00:00Z`);
}

function daysBetween(d1, d2) {
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().split('T')[0];
}

function parseMarkdownTable(content, minColumns) {
  const entries = [];
  for (const line of content.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (line.includes('---')) continue;
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < minColumns) continue;
    entries.push(parts);
  }
  return entries;
}

function parseTracker() {
  if (!existsSync(APPS_FILE)) return [];
  const content = readFileSync(APPS_FILE, 'utf-8');
  return parseMarkdownTable(content, 9)
    .map((parts) => {
      const num = parseInt(parts[1], 10);
      if (Number.isNaN(num)) return null;
      return {
        num,
        date: parts[2],
        company: parts[3],
        role: parts[4],
        score: parts[5],
        status: parts[6],
        pdf: parts[7],
        report: parts[8],
        notes: parts[9] || '',
      };
    })
    .filter(Boolean);
}

function parseFollowups() {
  if (!existsSync(FOLLOWUPS_FILE)) return [];
  const content = readFileSync(FOLLOWUPS_FILE, 'utf-8');
  return parseMarkdownTable(content, 8)
    .map((parts) => {
      const num = parseInt(parts[1], 10);
      const appNum = parseInt(parts[2], 10);
      if (Number.isNaN(num) || Number.isNaN(appNum)) return null;
      return {
        num,
        appNum,
        date: parts[3],
        company: parts[4],
        role: parts[5],
        channel: parts[6],
        contact: parts[7],
        notes: parts[8] || '',
      };
    })
    .filter(Boolean);
}

function extractContacts(notes) {
  if (!notes) return [];
  const contacts = [];
  const emails = String(notes).match(/[\w.+-]+@[\w.-]+\.\w+/g) || [];

  for (const email of emails) {
    let name = null;
    const beforeEmail = notes.slice(0, notes.indexOf(email));
    const nameMatch = beforeEmail.match(/(?:Emailed|emailed|contact[:\s]+|to\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:at|@|$)/);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }
    contacts.push({ email, name });
  }

  return contacts;
}

function resolveReportPath(reportField) {
  const match = String(reportField || '').match(/\]\(([^)]+)\)/);
  if (!match) return null;
  const relPath = match[1];
  const fullPath = join(CAREER_OPS, relPath);
  return existsSync(fullPath) ? relPath : null;
}

function computeUrgency(status, daysSinceApp, daysSinceLastFollowup, followupCount) {
  if (status === 'applied') {
    if (followupCount >= CADENCE.applied_max_followups) return 'cold';
    if (followupCount === 0 && daysSinceApp >= CADENCE.applied_first) return 'overdue';
    if (followupCount > 0 && daysSinceLastFollowup !== null && daysSinceLastFollowup >= CADENCE.applied_subsequent) return 'overdue';
    return 'waiting';
  }

  if (status === 'response_received') {
    if (daysSinceLastFollowup === null && daysSinceApp >= CADENCE.responded_initial) return 'urgent';
    if (daysSinceLastFollowup !== null && daysSinceLastFollowup >= CADENCE.responded_subsequent) return 'overdue';
    return 'waiting';
  }

  if (status === 'interview') {
    if (daysSinceLastFollowup === null && daysSinceApp >= CADENCE.interview_thankyou) return 'overdue';
    if (daysSinceLastFollowup !== null && daysSinceLastFollowup >= CADENCE.responded_subsequent) return 'overdue';
    return 'waiting';
  }

  return 'waiting';
}

function computeNextFollowupDate(status, appDate, lastFollowupDate, followupCount) {
  if (status === 'applied') {
    if (followupCount >= CADENCE.applied_max_followups) return null;
    if (followupCount === 0) return addDays(parseDate(appDate), CADENCE.applied_first);
    if (lastFollowupDate) return addDays(parseDate(lastFollowupDate), CADENCE.applied_subsequent);
    return addDays(parseDate(appDate), CADENCE.applied_first);
  }

  if (status === 'response_received') {
    if (lastFollowupDate) return addDays(parseDate(lastFollowupDate), CADENCE.responded_subsequent);
    return addDays(parseDate(appDate), CADENCE.responded_initial);
  }

  if (status === 'interview') {
    if (lastFollowupDate) return addDays(parseDate(lastFollowupDate), CADENCE.responded_subsequent);
    return addDays(parseDate(appDate), CADENCE.interview_thankyou);
  }

  return null;
}

function analyze() {
  const apps = parseTracker();
  if (apps.length === 0) {
    return { error: 'No applications found in tracker.' };
  }

  const followups = parseFollowups();
  const followupsByApp = new Map();
  for (const followup of followups) {
    if (!followupsByApp.has(followup.appNum)) {
      followupsByApp.set(followup.appNum, []);
    }
    followupsByApp.get(followup.appNum).push(followup);
  }

  const now = today();
  const entries = [];

  for (const app of apps) {
    const statusGroup = normalizeTrackerStatusGroup(app.status);
    if (!ACTIONABLE_STATUSES.includes(statusGroup)) continue;

    const appDate = parseDate(app.date);
    if (!appDate) continue;

    const appFollowups = [...(followupsByApp.get(app.num) || [])].sort((a, b) => (a.date > b.date ? -1 : 1));
    const followupCount = appFollowups.length;
    const lastFollowupDate = appFollowups[0]?.date || null;
    const lastFollowup = lastFollowupDate ? parseDate(lastFollowupDate) : null;
    const daysSinceApp = daysBetween(appDate, now);
    const daysSinceLastFollowup = lastFollowup ? daysBetween(lastFollowup, now) : null;
    const nextFollowupDate = computeNextFollowupDate(statusGroup, app.date, lastFollowupDate, followupCount);
    const nextDate = nextFollowupDate ? parseDate(nextFollowupDate) : null;
    const daysUntilNext = nextDate ? daysBetween(now, nextDate) : null;
    const urgency = computeUrgency(statusGroup, daysSinceApp, daysSinceLastFollowup, followupCount);

    entries.push({
      num: app.num,
      date: app.date,
      company: app.company,
      role: app.role,
      status: statusGroup,
      score: app.score,
      notes: app.notes,
      reportPath: resolveReportPath(app.report),
      contacts: extractContacts(app.notes),
      daysSinceApplication: daysSinceApp,
      daysSinceLastFollowup,
      followupCount,
      urgency,
      nextFollowupDate,
      daysUntilNext,
    });
  }

  const actionableEntries = overdueOnly
    ? entries.filter((entry) => entry.urgency === 'urgent' || entry.urgency === 'overdue')
    : entries;

  actionableEntries.sort((a, b) => {
    const urgencyDiff = (URGENCY_ORDER.get(a.urgency) ?? 99) - (URGENCY_ORDER.get(b.urgency) ?? 99);
    if (urgencyDiff !== 0) return urgencyDiff;
    return b.daysSinceApplication - a.daysSinceApplication;
  });

  return {
    metadata: {
      date: now.toISOString().split('T')[0],
      totalTracked: apps.length,
      actionableCount: actionableEntries.length,
      overdueCount: actionableEntries.filter((entry) => entry.urgency === 'overdue').length,
      urgentCount: actionableEntries.filter((entry) => entry.urgency === 'urgent').length,
      coldCount: actionableEntries.filter((entry) => entry.urgency === 'cold').length,
      waitingCount: actionableEntries.filter((entry) => entry.urgency === 'waiting').length,
    },
    cadenceConfig: CADENCE,
    entries: actionableEntries,
  };
}

function printSummary(result) {
  if (result.error) {
    console.log(result.error);
    return;
  }

  const { metadata, entries } = result;
  console.log(`Follow-up Cadence Dashboard - ${metadata.date}`);
  console.log(`${metadata.totalTracked} applications tracked, ${metadata.actionableCount} actionable`);
  console.log('');
  console.log('| # | Company | Role | Status | Days | Follow-ups | Next | Urgency | Contact |');
  console.log('|---|---------|------|--------|------|------------|------|---------|---------|');

  for (const entry of entries) {
    const contact = entry.contacts[0]?.email || '-';
    const next = entry.nextFollowupDate || '-';
    console.log(`| ${entry.num} | ${entry.company} | ${entry.role} | ${entry.status} | ${entry.daysSinceApplication} | ${entry.followupCount} | ${next} | ${entry.urgency} | ${contact} |`);
  }
}

const result = analyze();

if (summaryMode) {
  printSummary(result);
} else {
  console.log(JSON.stringify(result, null, 2));
}
