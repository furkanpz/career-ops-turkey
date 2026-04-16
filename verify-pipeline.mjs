#!/usr/bin/env node
/**
 * verify-pipeline.mjs — Health check for career-ops pipeline integrity
 *
 * Checks:
 * 1. All statuses are canonical (per tracker-status-registry.json)
 * 2. No duplicate company+role entries
 * 3. All report links point to existing files
 * 4. Scores match format X.XX/5 or N/A or DUP
 * 5. All rows have proper pipe-delimited format
 * 6. No pending TSVs in tracker-additions/ (only in merged/ or archived/)
 * 7. Registry-backed canonical IDs for cross-system consistency
 *
 * Run: node career-ops/verify-pipeline.mjs
 */

import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { basename, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TRACKER_CANONICAL_STATUSES, normalizeTrackerStatus } from './tracker-status-utils.mjs';

const CAREER_OPS = process.env.CAREER_OPS_ROOT || dirname(fileURLToPath(import.meta.url));
// Support both layouts: data/applications.md (boilerplate) and applications.md (original)
const APPS_FILE = existsSync(join(CAREER_OPS, 'data/applications.md'))
  ? join(CAREER_OPS, 'data/applications.md')
  : join(CAREER_OPS, 'applications.md');
const ADDITIONS_DIR = join(CAREER_OPS, 'batch/tracker-additions');
const REPORTS_DIR = join(CAREER_OPS, 'reports');
const PIPELINE_FILE = join(CAREER_OPS, 'data/pipeline.md');
const REVIEW_PIPELINE_FILE = join(CAREER_OPS, 'data/review-pipeline.md');
const OUTPUT_DIR = join(CAREER_OPS, 'output');
const TR_LISTINGS_FILE = join(CAREER_OPS, 'data/tr-listings.jsonl');
const SCAN_DIAGNOSTICS_FILE = join(CAREER_OPS, 'data/scan-diagnostics.json');
const STATES_FILE = existsSync(join(CAREER_OPS, 'templates/states.yml'))
  ? join(CAREER_OPS, 'templates/states.yml')
  : join(CAREER_OPS, 'states.yml');

// Ensure required directories exist (fresh setup)
mkdirSync(join(CAREER_OPS, 'data'), { recursive: true });
mkdirSync(REPORTS_DIR, { recursive: true });

let errors = 0;
let warnings = 0;

function error(msg) { console.log(`❌ ${msg}`); errors++; }
function warn(msg) { console.log(`⚠️  ${msg}`); warnings++; }
function ok(msg) { console.log(`✅ ${msg}`); }

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf-8') : '';
}

function repoPath(relativePath) {
  return join(CAREER_OPS, String(relativePath || '').replace(/^\/+/, ''));
}

function parseScore(score) {
  const match = String(score || '').replace(/\*\*/g, '').trim().match(/^(\d+(?:\.\d+)?)\/5$/);
  return match ? Number.parseFloat(match[1]) : null;
}

function extractReportPath(entry) {
  const match = entry.report.match(/\]\(([^)]+)\)/);
  return match?.[1] || '';
}

function extractReportHeaderValue(reportText, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return reportText.match(new RegExp(`^\\*\\*${escaped}:\\*\\*\\s*(.+)$`, 'mi'))?.[1]?.trim() || '';
}

function isPdfGeneratedValue(value) {
  return Boolean(value)
    && !/^not generated\b/i.test(value)
    && !/^ü?retilmedi\b/i.test(value)
    && !/^pending\b/i.test(value);
}

// --- Read applications.md ---
if (!existsSync(APPS_FILE)) {
  console.log('\n📊 No applications.md found. This is normal for a fresh setup.');
  console.log('   The file will be created when you evaluate your first offer.\n');
  process.exit(0);
}
const content = readFileSync(APPS_FILE, 'utf-8');
const lines = content.split('\n');

const entries = [];
for (const line of lines) {
  if (!line.startsWith('|')) continue;
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) continue;
  const num = parseInt(parts[1]);
  if (isNaN(num)) continue;
  entries.push({
    num, date: parts[2], company: parts[3], role: parts[4],
    score: parts[5], status: parts[6], pdf: parts[7], report: parts[8],
    notes: parts[9] || '',
  });
}

console.log(`\n📊 Checking ${entries.length} entries in applications.md\n`);

// --- Check 1: Canonical statuses ---
let badStatuses = 0;
for (const e of entries) {
  const cleaned = e.status.replace(/\*\*/g, '').trim();
  const normalized = normalizeTrackerStatus(e.status);

  if (!normalized.status) {
    error(`#${e.num}: Non-canonical status "${e.status}"`);
    badStatuses++;
  } else if (!normalized.canonical || !TRACKER_CANONICAL_STATUSES.includes(cleaned)) {
    error(`#${e.num}: Status must use canonical label, found "${e.status}"`);
    badStatuses++;
  }

  // Check for markdown bold in status
  if (e.status.includes('**')) {
    error(`#${e.num}: Status contains markdown bold: "${e.status}"`);
    badStatuses++;
  }

  // Check for dates in status
  if (/\d{4}-\d{2}-\d{2}/.test(e.status)) {
    error(`#${e.num}: Status contains date: "${e.status}" — dates go in date column`);
    badStatuses++;
  }
}
if (badStatuses === 0) ok('All statuses are canonical');

// --- Check 2: Duplicates ---
const companyRoleMap = new Map();
let dupes = 0;
for (const e of entries) {
  const key = e.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '::' +
    e.role.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  if (!companyRoleMap.has(key)) companyRoleMap.set(key, []);
  companyRoleMap.get(key).push(e);
}
for (const [key, group] of companyRoleMap) {
  if (group.length > 1) {
    warn(`Possible duplicates: ${group.map(e => `#${e.num}`).join(', ')} (${group[0].company} — ${group[0].role})`);
    dupes++;
  }
}
if (dupes === 0) ok('No exact duplicates found');

// --- Check 3: Report links ---
let brokenReports = 0;
const referencedReportFiles = new Set();
const reportPathByEntry = new Map();
for (const e of entries) {
  const reportRef = extractReportPath(e);
  if (!reportRef) continue;
  referencedReportFiles.add(basename(reportRef));
  const reportPath = repoPath(reportRef);
  reportPathByEntry.set(e.num, reportPath);
  if (!existsSync(reportPath)) {
    error(`#${e.num}: Report not found: ${reportRef}`);
    brokenReports++;
  }
}
if (brokenReports === 0) ok('All report links valid');

// --- Check 3b: Orphan reports ---
let orphanReports = 0;
const reportFiles = existsSync(REPORTS_DIR)
  ? readdirSync(REPORTS_DIR).filter((file) => /^\d{3}-.+\.md$/.test(file))
  : [];
for (const file of reportFiles) {
  if (!referencedReportFiles.has(file)) {
    warn(`orphan_report: ${file} exists in reports/ but is not linked from applications.md`);
    orphanReports++;
  }
}
if (orphanReports === 0) ok('No orphan reports found');

// --- Check 4: Score format ---
let badScores = 0;
for (const e of entries) {
  const s = e.score.replace(/\*\*/g, '').trim();
  if (!/^\d+\.?\d*\/5$/.test(s) && s !== 'N/A' && s !== 'DUP') {
    error(`#${e.num}: Invalid score format: "${e.score}"`);
    badScores++;
  }
}
if (badScores === 0) ok('All scores valid');

// --- Check 4b: PDF and recommendation consistency ---
let missingPdfFiles = 0;
let skipWithGeneratedPdf = 0;
let skipWithApplyScore = 0;
const referencedPdfFiles = new Set();
for (const e of entries) {
  const reportPath = reportPathByEntry.get(e.num);
  const reportText = reportPath && existsSync(reportPath) ? readFileSync(reportPath, 'utf-8') : '';
  const pdfValue = extractReportHeaderValue(reportText, 'PDF');
  const hasGeneratedPdf = isPdfGeneratedValue(pdfValue);
  if (hasGeneratedPdf) {
    referencedPdfFiles.add(basename(pdfValue));
  }

  if (e.pdf.includes('✅')) {
    if (!hasGeneratedPdf) {
      error(`missing_pdf_file: #${e.num} tracker says PDF ✅ but report PDF header is missing or not generated`);
      missingPdfFiles++;
      continue;
    }
    const pdfPath = repoPath(pdfValue);
    if (!existsSync(pdfPath)) {
      error(`missing_pdf_file: #${e.num} PDF not found: ${pdfValue}`);
      missingPdfFiles++;
    }
  }

  if (e.status === 'SKIP' && hasGeneratedPdf) {
    warn(`skip_with_generated_pdf: #${e.num} is SKIP but has generated PDF (${pdfValue})`);
    skipWithGeneratedPdf++;
  }

  const numericScore = parseScore(e.score);
  if (e.status === 'SKIP' && numericScore !== null && numericScore >= 3) {
    warn(`low_priority_skip: #${e.num} has score ${e.score} but status SKIP; keep only if recommendation says do not apply despite score`);
    skipWithApplyScore++;
  }
}
if (missingPdfFiles === 0) ok('All tracker PDF links point to generated files');
if (skipWithGeneratedPdf === 0) ok('No generated PDFs on SKIP rows');
if (skipWithApplyScore === 0) ok('No score>=3 SKIP rows requiring explanation');

// --- Check 5: Row format ---
let badRows = 0;
for (const line of lines) {
  if (!line.startsWith('|')) continue;
  if (line.includes('---') || line.includes('Empresa')) continue;
  const parts = line.split('|');
  if (parts.length < 9) {
    error(`Row with <9 columns: ${line.substring(0, 80)}...`);
    badRows++;
  }
}
if (badRows === 0) ok('All rows properly formatted');

// --- Check 6: Pending TSVs ---
let pendingTsvs = 0;
if (existsSync(ADDITIONS_DIR)) {
  const files = readdirSync(ADDITIONS_DIR).filter(f => f.endsWith('.tsv'));
  pendingTsvs = files.length;
  if (pendingTsvs > 0) {
    warn(`${pendingTsvs} pending TSVs in tracker-additions/ (not merged)`);
  }
}
if (pendingTsvs === 0) ok('No pending TSVs');

// --- Check 6b: Review queue and sidecar consistency ---
const reviewText = readIfExists(REVIEW_PIPELINE_FILE);
const pipelineText = readIfExists(PIPELINE_FILE);
const pendingPipelineItems = pipelineText
  .split('\n')
  .filter((line) => /^- \[ \] \S+/.test(line)).length;
if (pendingPipelineItems > 0) {
  warn(`pipeline_pending: ${pendingPipelineItems} pending item(s) in data/pipeline.md`);
} else {
  ok('No pending pipeline inbox items');
}

const pendingReviewItems = reviewText
  .split('\n')
  .filter((line) => /^- \[ \] \S+ \| /.test(line)).length;
if (pendingReviewItems > 0) {
  warn(`review_queue_pending: ${pendingReviewItems} unchecked item(s) in data/review-pipeline.md`);
} else {
  ok('No pending review queue items');
}

let malformedTrListingRows = 0;
if (existsSync(TR_LISTINGS_FILE)) {
  const trListingLines = readIfExists(TR_LISTINGS_FILE).split('\n').filter(Boolean);
  for (const [index, line] of trListingLines.entries()) {
    try {
      const row = JSON.parse(line);
      if (!row.canonical_url && !row.url) {
        warn(`tr_listing_missing_url: data/tr-listings.jsonl row ${index + 1} has no url`);
      }
    } catch {
      error(`tr_listing_malformed: data/tr-listings.jsonl row ${index + 1} is not valid JSON`);
      malformedTrListingRows++;
    }
  }
  if (malformedTrListingRows === 0) ok('TR listing sidecar is parseable');
}

if (existsSync(OUTPUT_DIR)) {
  const outputPdfs = readdirSync(OUTPUT_DIR).filter((file) => file.endsWith('.pdf'));
  const orphanPdfs = outputPdfs.filter((file) => !referencedPdfFiles.has(file));
  for (const file of orphanPdfs) {
    warn(`orphan_pdf: output/${file} is not referenced by any application report`);
  }
  if (orphanPdfs.length === 0) ok('All output PDFs are referenced by reports');
}

if (existsSync(SCAN_DIAGNOSTICS_FILE)) {
  try {
    const diagnostics = JSON.parse(readIfExists(SCAN_DIAGNOSTICS_FILE));
    const diagnosticWarnings = Array.isArray(diagnostics.warnings) ? diagnostics.warnings.length : 0;
    if (diagnosticWarnings > 0) {
      warn(`scan_provider_degraded: latest scan diagnostics contain ${diagnosticWarnings} provider/source warning(s)`);
    } else {
      ok('Latest scan diagnostics have no provider warnings');
    }
  } catch {
    error('scan_provider_degraded: data/scan-diagnostics.json is not valid JSON');
  }
}

// --- Check 7: Bold in scores ---
let boldScores = 0;
for (const e of entries) {
  if (e.score.includes('**')) {
    warn(`#${e.num}: Score has markdown bold: "${e.score}"`);
    boldScores++;
  }
}
if (boldScores === 0) ok('No bold in scores');

// --- Summary ---
console.log('\n' + '='.repeat(50));
console.log(`📊 Pipeline Health: ${errors} errors, ${warnings} warnings`);
if (errors === 0 && warnings === 0) {
  console.log('🟢 Pipeline is clean!');
} else if (errors === 0) {
  console.log('🟡 Pipeline OK with warnings');
} else {
  console.log('🔴 Pipeline has errors — fix before proceeding');
}

process.exit(errors > 0 ? 1 : 0);
