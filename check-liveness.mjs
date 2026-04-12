#!/usr/bin/env node

/**
 * check-liveness.mjs — Playwright job link liveness checker
 *
 * Tests whether job posting URLs are still active or have expired.
 * Uses the same detection logic as scan.md step 7.5.
 * Zero Claude API tokens — pure Playwright.
 *
 * Usage:
 *   node check-liveness.mjs <url1> [url2] ...
 *   node check-liveness.mjs --file urls.txt
 *
 * Exit code: 0 if all active, 1 if any expired, blocked, or uncertain
 */

import { chromium } from 'playwright';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

export const EXPIRED_PATTERNS = [
  /job (is )?no longer available/i,
  /job.*no longer open/i,           // Greenhouse: "The job you are looking for is no longer open."
  /position has been filled/i,
  /this job has expired/i,
  /job posting has expired/i,
  /no longer accepting applications/i,
  /this (position|role|job) (is )?no longer/i,
  /this job (listing )?is closed/i,
  /job (listing )?not found/i,
  /the page you are looking for doesn.t exist/i, // Workday /job/ 404
  /\d+\s+jobs?\s+found/i,           // Workday: landed on listing page ("663 JOBS FOUND") instead of a specific job
  /search for jobs page is loaded/i, // Workday SPA indicator for listing page
  /diese stelle (ist )?(nicht mehr|bereits) besetzt/i,
  /offre (expirée|n'est plus disponible)/i,
  /ilan (artik )?(yayinda|yayında|aktif) degil/i,
  /ilan (kaldirildi|kaldırıldı|kapandi|kapandı)/i,
  /bu ilan (artik )?mevcut degil/i,
  /pozisyon (doldu|kapandi|kapandı)/i,
  /basvuru(?:lar)? (kapandi|kapandı|sona erdi)/i,
  /başvuru(?:lar)? (kapandı|sona erdi)/i,
  /ilan suresi doldu/i,
  /ilan bulunamadi/i,
  /ilan bulunamadı/i,
];

// URL patterns that indicate an ATS has redirected away from the job (closed/expired)
export const EXPIRED_URL_PATTERNS = [
  /[?&]error=true/i,   // Greenhouse redirect on closed jobs
];

export const BLOCKED_PATTERNS = [
  /\bsign in\b/i,
  /\blog in\b/i,
  /\bgiris yap\b/i,
  /\bgiriş yap\b/i,
  /\boturum ac\b/i,
  /\boturum aç\b/i,
  /\bjoin linkedin\b/i,
  /\baccess denied\b/i,
  /\bforbidden\b/i,
  /\bverify you are human\b/i,
  /\bcaptcha\b/i,
  /\bsecurity check\b/i,
  /\bnot authorized\b/i,
  /\bpermission denied\b/i,
];

export const BLOCKED_URL_PATTERNS = [
  /linkedin\.com\/(?:checkpoint|authwall|login|uas\/login)/i,
  /\/login(?:[/?#]|$)/i,
  /challenge/i,
];

export const APPLY_PATTERNS = [
  /\bapply\b/i,          // catches "Apply", "Apply Now", "Apply for this Job"
  /\bsolicitar\b/i,
  /\bbewerben\b/i,
  /\bpostuler\b/i,
  /\bbasvur\b/i,
  /başvur/i,
  /hemen basvur/i,
  /hemen başvur/i,
  /basvuru yap/i,
  /başvuru yap/i,
  /submit application/i,
  /easy apply/i,
  /start application/i,  // Ashby
  /ich bewerbe mich/i,   // German Greenhouse
];

// Below this length the page is probably just nav/footer (closed ATS page)
export const MIN_CONTENT_CHARS = 300;

function normalizeBodyText(bodyText) {
  return String(bodyText ?? '').replace(/\s+/g, ' ').trim();
}

function isBlockedNavigationError(err) {
  const message = String(err?.message ?? '');
  return (
    /timeout/i.test(message) ||
    /ERR_(ABORTED|TIMED_OUT|CONNECTION|NETWORK|BLOCKED|FAILED)/i.test(message) ||
    /Target page, context or browser has been closed/i.test(message)
  );
}

export function classifyLivenessSignals({ status = 0, finalUrl = '', bodyText = '' } = {}) {
  const normalizedText = normalizeBodyText(bodyText);

  if (status === 401 || status === 403 || status === 429) {
    return { result: 'blocked', reason: `HTTP ${status}` };
  }

  if (status === 404 || status === 410) {
    return { result: 'expired', reason: `HTTP ${status}` };
  }

  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (pattern.test(finalUrl)) {
      return { result: 'blocked', reason: `redirect to ${finalUrl}` };
    }
  }

  for (const pattern of EXPIRED_URL_PATTERNS) {
    if (pattern.test(finalUrl)) {
      return { result: 'expired', reason: `redirect to ${finalUrl}` };
    }
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return { result: 'blocked', reason: `pattern matched: ${pattern.source}` };
    }
  }

  if (APPLY_PATTERNS.some((pattern) => pattern.test(normalizedText))) {
    return { result: 'active', reason: 'apply button detected' };
  }

  for (const pattern of EXPIRED_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return { result: 'expired', reason: `pattern matched: ${pattern.source}` };
    }
  }

  if (normalizedText.length < MIN_CONTENT_CHARS) {
    return { result: 'expired', reason: 'insufficient content — likely nav/footer only' };
  }

  return { result: 'uncertain', reason: 'content present but no apply button found' };
}

export async function checkUrl(page, url) {
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Give SPAs (Ashby, Lever, Workday) time to hydrate
    await page.waitForTimeout(2000);
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    return classifyLivenessSignals({
      status: response?.status() ?? 0,
      finalUrl: page.url(),
      bodyText,
    });

  } catch (err) {
    const message = String(err?.message ?? '').split('\n')[0];
    if (isBlockedNavigationError(err)) {
      return { result: 'blocked', reason: `navigation error: ${message}` };
    }
    return { result: 'expired', reason: `navigation error: ${message}` };
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node check-liveness.mjs <url1> [url2] ...');
    console.error('       node check-liveness.mjs --file urls.txt');
    process.exit(1);
  }

  let urls;
  if (args[0] === '--file') {
    const text = await readFile(args[1], 'utf-8');
    urls = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  } else {
    urls = args;
  }

  console.log(`Checking ${urls.length} URL(s)...\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let active = 0, expired = 0, uncertain = 0;
  let blocked = 0;

  // Sequential — project rule: never Playwright in parallel
  for (const url of urls) {
    const { result, reason } = await checkUrl(page, url);
    const icon = { active: '✅', expired: '❌', uncertain: '⚠️', blocked: '⛔' }[result];
    console.log(`${icon} ${result.padEnd(10)} ${url}`);
    if (result !== 'active') console.log(`           ${reason}`);
    if (result === 'active') active++;
    else if (result === 'expired') expired++;
    else if (result === 'blocked') blocked++;
    else uncertain++;
  }

  await browser.close();

  console.log(`\nResults: ${active} active  ${expired} expired  ${blocked} blocked  ${uncertain} uncertain`);
  if (expired > 0 || blocked > 0 || uncertain > 0) process.exit(1);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
