#!/usr/bin/env node

/**
 * scan.mjs — Hybrid portal scanner for the Turkey locale fork
 *
 * One entrypoint for:
 * - direct ATS/API scans from tracked_companies
 * - generic company careers page discovery
 * - search_queries discovery for Turkish and EMEA job boards
 *
 * Usage:
 *   node scan.mjs
 *   node scan.mjs --dry-run
 *   node scan.mjs --company Papara
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { chromium } from 'playwright';
import { checkUrl } from './check-liveness.mjs';
import { normalizeCompanyKey, normalizeRoleTitle } from './company-name-utils.mjs';

const parseYaml = yaml.load;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const PORTALS_PATH = join(ROOT, 'portals.yml');
const DATA_DIR = join(ROOT, 'data');
const SCAN_HISTORY_PATH = join(DATA_DIR, 'scan-history.tsv');
const PIPELINE_PATH = join(DATA_DIR, 'pipeline.md');
const APPLICATIONS_PATH = existsSync(join(DATA_DIR, 'applications.md'))
  ? join(DATA_DIR, 'applications.md')
  : join(ROOT, 'applications.md');

const FETCH_TIMEOUT_MS = 12_000;
const API_CONCURRENCY = 8;
const SEARCH_CONCURRENCY = 4;
const SEARCH_RESULT_LIMIT = 8;
const CAREERS_PAGE_TIMEOUT_MS = 20_000;
const CAREERS_PAGE_WAIT_MS = 2_000;
const SEARCH_ENDPOINT = 'https://html.duckduckgo.com/html/';

export const PRIMARY_TR_PARSER_KEYS = [
  'linkedin_jobs_search',
  'kariyernet_search',
  'indeed_tr_search',
  'elemannet_search',
];

const SECONDARY_TR_PARSER_KEYS = [
  'secretcv_search',
  'yenibiris_search',
  'iskur_search',
];

const KNOWN_TR_PARSER_KEYS = new Set([
  ...PRIMARY_TR_PARSER_KEYS,
  ...SECONDARY_TR_PARSER_KEYS,
  'youthall_search',
]);

const SEARCH_SOURCE_PROFILES = {
  linkedin_jobs_search: {
    source: 'LinkedIn',
    sourceType: 'job_board',
    priority: 80,
    siteTokens: ['linkedin'],
  },
  kariyernet_search: {
    source: 'Kariyer.net',
    sourceType: 'job_board',
    priority: 70,
    siteTokens: ['kariyer.net', 'kariyer net', 'is ilani', 'iş ilanı'],
  },
  indeed_tr_search: {
    source: 'Indeed',
    sourceType: 'aggregator',
    priority: 60,
    siteTokens: ['indeed', 'indeed.com'],
  },
  elemannet_search: {
    source: 'Eleman.net',
    sourceType: 'job_board',
    priority: 50,
    siteTokens: ['eleman.net', 'eleman net'],
  },
  secretcv_search: {
    source: 'Secretcv',
    sourceType: 'job_board',
    priority: 40,
    siteTokens: ['secretcv', 'secret cv'],
  },
  yenibiris_search: {
    source: 'Yenibiris',
    sourceType: 'job_board',
    priority: 30,
    siteTokens: ['yenibiris', 'yeni bir is', 'yeni bir iş'],
  },
  iskur_search: {
    source: 'ISKUR',
    sourceType: 'job_board',
    priority: 20,
    siteTokens: ['iskur', 'i̇şkur', 'işkur'],
  },
  youthall_search: {
    source: 'Youthall',
    sourceType: 'job_board',
    priority: 10,
    siteTokens: ['youthall'],
  },
  greenhouse_board: {
    source: 'Greenhouse',
    sourceType: 'company_careers',
    priority: 90,
    siteTokens: ['greenhouse'],
  },
  ashby_board: {
    source: 'Ashby',
    sourceType: 'company_careers',
    priority: 90,
    siteTokens: ['ashby'],
  },
  lever_board: {
    source: 'Lever',
    sourceType: 'company_careers',
    priority: 90,
    siteTokens: ['lever'],
  },
  workable_board: {
    source: 'Workable',
    sourceType: 'company_careers',
    priority: 90,
    siteTokens: ['workable'],
  },
  teamtailor_board: {
    source: 'Teamtailor',
    sourceType: 'company_careers',
    priority: 90,
    siteTokens: ['teamtailor'],
  },
  custom_careers_hub: {
    source: 'Company Careers',
    sourceType: 'company_careers',
    priority: 100,
    siteTokens: ['career', 'careers', 'jobs'],
  },
};

const LOCATION_SUFFIXES = [
  'istanbul',
  'ankara',
  'izmir',
  'kocaeli',
  'bursa',
  'eskisehir',
  'adana',
  'antalya',
  'gaziantep',
  'mersin',
  'konya',
  'sakarya',
  'mugla',
  'turkey',
  'turkiye',
  'türkiye',
  'tr',
  'emea',
  'remote',
  'hybrid',
  'hibrit',
  'uzaktan',
];

const SEARCH_TITLE_PATTERNS = [
  /^(?<role>.+?)\s+@\s+(?<company>.+)$/i,
  /^(?<role>.+?)\s+at\s+(?<company>.+)$/i,
  /^(?<role>.+?)\s+[|]\s+(?<company>.+)$/i,
];

const DEPARTMENT_SUFFIXES = [
  'data science',
  'engineering',
  'product',
  'marketing',
  'people',
  'workplace',
  'art',
  'design',
  'hr',
  'human resources',
];

function foldText(value) {
  return String(value ?? '')
    .replace(/[İIı]/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function insertCamelSpacing(value) {
  return String(value ?? '')
    .replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2')
    .replace(/([A-ZÇĞİÖŞÜ]{2,})([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)/g, '$1 $2');
}

function stripTags(value) {
  return decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' '));
}

function sourceProfileFor(parserKey, fallbackFamily = 'turkish_job_board') {
  const profile = SEARCH_SOURCE_PROFILES[parserKey];
  if (profile) return profile;

  if (fallbackFamily === 'company_careers') {
    return SEARCH_SOURCE_PROFILES.custom_careers_hub;
  }
  if (fallbackFamily === 'global_ats') {
    return SEARCH_SOURCE_PROFILES.greenhouse_board;
  }
  return SEARCH_SOURCE_PROFILES.kariyernet_search;
}

export function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map((token) => foldText(token));
  const negative = (titleFilter?.negative || []).map((token) => foldText(token));

  return (title) => {
    const normalized = foldText(title);
    const hasPositive = positive.length === 0 || positive.some((token) => normalized.includes(token));
    const hasNegative = negative.some((token) => normalized.includes(token));
    return hasPositive && !hasNegative;
  };
}

function makeFetchOptions(extra = {}) {
  return {
    headers: {
      'user-agent': 'career-ops/1.2.0 (+https://github.com/furkanpz/career-ops-turkey)',
      'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      ...extra.headers,
    },
    ...extra,
  };
}

async function fetchText(url, extra = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...makeFetchOptions(extra), signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, extra = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...makeFetchOptions(extra), signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function detectApi(company) {
  if (company.api && company.api.includes('greenhouse')) {
    return { type: 'greenhouse', url: company.api };
  }

  const careersUrl = String(company.careers_url || '');

  const ashbyMatch = careersUrl.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashbyMatch) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}?includeCompensation=true`,
    };
  }

  const leverMatch = careersUrl.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (leverMatch) {
    return {
      type: 'lever',
      url: `https://api.lever.co/v0/postings/${leverMatch[1]}`,
    };
  }

  const greenhouseMatch = careersUrl.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (greenhouseMatch) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${greenhouseMatch[1]}/jobs`,
    };
  }

  return null;
}

function parseGreenhouse(json, company, parserKey = 'greenhouse_board') {
  return (json.jobs || []).map((job) => ({
    title: normalizeWhitespace(job.title || ''),
    url: job.absolute_url || '',
    company: company.name,
    location: normalizeWhitespace(job.location?.name || ''),
    parserKey,
    source: 'Greenhouse',
    sourceType: 'company_careers',
    sourcePriority: sourceProfileFor(parserKey).priority,
    requiresLivenessCheck: false,
    discoveryMethod: 'json_api',
    queryName: company.name,
    adapterFamily: company.adapter_family || 'company_careers',
  }));
}

function parseAshby(json, company, parserKey = 'ashby_board') {
  return (json.jobs || []).map((job) => ({
    title: normalizeWhitespace(job.title || ''),
    url: job.jobUrl || '',
    company: company.name,
    location: normalizeWhitespace(job.location || ''),
    parserKey,
    source: 'Ashby',
    sourceType: 'company_careers',
    sourcePriority: sourceProfileFor(parserKey).priority,
    requiresLivenessCheck: false,
    discoveryMethod: 'json_api',
    queryName: company.name,
    adapterFamily: company.adapter_family || 'company_careers',
  }));
}

function parseLever(json, company, parserKey = 'lever_board') {
  if (!Array.isArray(json)) return [];
  return json.map((job) => ({
    title: normalizeWhitespace(job.text || ''),
    url: job.hostedUrl || '',
    company: company.name,
    location: normalizeWhitespace(job.categories?.location || ''),
    parserKey,
    source: 'Lever',
    sourceType: 'company_careers',
    sourcePriority: sourceProfileFor(parserKey).priority,
    requiresLivenessCheck: false,
    discoveryMethod: 'json_api',
    queryName: company.name,
    adapterFamily: company.adapter_family || 'company_careers',
  }));
}

const API_PARSERS = {
  greenhouse: parseGreenhouse,
  ashby: parseAshby,
  lever: parseLever,
};

function ensureDataFiles() {
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(PIPELINE_PATH)) {
    writeFileSync(PIPELINE_PATH, '# Pipeline Inbox\n\n## Pendientes\n\n## Procesadas\n', 'utf-8');
  }
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n', 'utf-8');
  }
}

function appendToPipeline(offers) {
  if (offers.length === 0) return;

  ensureDataFiles();
  let text = readFileSync(PIPELINE_PATH, 'utf-8');
  const marker = '## Pendientes';
  const markerIndex = text.indexOf(marker);

  const lines = offers.map((offer) => `- [ ] ${offer.url} | ${offer.company} | ${offer.title}`);
  if (markerIndex === -1) {
    text += `\n## Pendientes\n\n${lines.join('\n')}\n`;
    writeFileSync(PIPELINE_PATH, text, 'utf-8');
    return;
  }

  const insertStart = markerIndex + marker.length;
  const nextSection = text.indexOf('\n## ', insertStart);
  const insertAt = nextSection === -1 ? text.length : nextSection;
  const block = `\n${lines.join('\n')}\n`;
  text = text.slice(0, insertAt) + block + text.slice(insertAt);
  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendHistory(entries) {
  if (entries.length === 0) return;
  ensureDataFiles();
  const lines = entries.map((entry) => [
    entry.url,
    entry.firstSeen,
    entry.portal,
    entry.title,
    entry.company,
    entry.status,
  ].join('\t'));
  appendFileSync(SCAN_HISTORY_PATH, `${lines.join('\n')}\n`, 'utf-8');
}

function loadSeenUrls() {
  const seen = new Set();
  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n').slice(1);
    for (const line of lines) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }

  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }

  return seen;
}

function makeCompanyRoleKey(company, role) {
  const normalizedCompany = normalizeCompanyKey(company);
  const normalizedRole = normalizeRoleTitle(role);
  return `${normalizedCompany}::${normalizedRole}`;
}

function loadSeenCompanyRoles() {
  const seen = new Set();

  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/\|[^|]+\|[^|]+\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g)) {
      const company = match[1]?.trim();
      const role = match[2]?.trim();
      if (company && role && foldText(company) !== 'company') {
        seen.add(makeCompanyRoleKey(company, role));
      }
    }
  }

  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] \S+ \| ([^|]+) \| ([^\n]+)/g)) {
      seen.add(makeCompanyRoleKey(match[1], match[2]));
    }
  }

  return seen;
}

function extractSearchTargetUrl(href) {
  const decodedHref = decodeHtmlEntities(href).replace(/^\/\//, 'https://');
  if (!decodedHref) return '';

  try {
    const url = new URL(decodedHref, SEARCH_ENDPOINT);
    if (url.hostname.includes('duckduckgo.com') && url.pathname === '/l/') {
      const target = url.searchParams.get('uddg');
      return target ? decodeURIComponent(target) : '';
    }
    return url.toString();
  } catch {
    return decodedHref;
  }
}

export function parseSearchResultsHtml(html) {
  const results = [];
  const seenUrls = new Set();
  const regex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = extractSearchTargetUrl(match[1]);
    const title = normalizeWhitespace(stripTags(match[2]));
    if (!url || !title || seenUrls.has(url)) continue;
    seenUrls.add(url);
    results.push({ url, title });
  }
  return results.slice(0, SEARCH_RESULT_LIMIT);
}

function stripSearchSourceSuffix(rawTitle, parserKey) {
  let title = normalizeWhitespace(rawTitle);
  const profile = sourceProfileFor(parserKey);
  const suffixPattern = new RegExp(`(?:\\||-|—|–)\\s*(?:${profile.siteTokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b.*$`, 'i');
  title = title.replace(suffixPattern, '').trim();
  title = title.replace(/\b(iş ilanı|is ilani|job posting|job listing)\b/gi, '').trim();
  return normalizeWhitespace(title);
}

function cleanCompanyToken(value) {
  return normalizeWhitespace(
    String(value ?? '')
      .replace(/\b(is hiring|hiring now|careers?|jobs?)\b/gi, '')
      .replace(/\b(kariyer\.net|indeed|linkedin|eleman\.net|iskur|i̇şkur|işkur|secretcv|yenibiris)\b/gi, '')
  );
}

function cleanRoleToken(value) {
  return normalizeWhitespace(
    String(value ?? '')
      .replace(/\b(araniyor|aranıyor|is ilani|iş ilanı|ilanı|kariyer)\b/gi, '')
      .replace(/\b(remote|hybrid|hibrit|uzaktan|istanbul|ankara|izmir|turkiye|türkiye|turkey|emea)\b/gi, '')
  );
}

export function normalizeCompanyListingTitle(value) {
  let title = normalizeWhitespace(insertCamelSpacing(value).replace(/\bNEW\b/gi, ' ').replace(/\s+/g, ' '));
  const normalized = foldText(title);

  for (const suffix of LOCATION_SUFFIXES) {
    const marker = ` ${suffix}`;
    const index = normalized.indexOf(marker);
    if (index > 0) {
      title = title.slice(0, index).trim();
      break;
    }
  }

  const loweredTitle = foldText(title);
  for (const suffix of DEPARTMENT_SUFFIXES) {
    const marker = ` ${suffix}`;
    const index = loweredTitle.indexOf(marker);
    if (index > 0) {
      title = title.slice(0, index).trim();
      break;
    }
  }

  return normalizeWhitespace(title.replace(/^[^a-zA-Z0-9ÇĞİÖŞÜçğıöşü]+/, ''));
}

function looksLikeLocationSegment(value) {
  const normalized = foldText(value);
  return LOCATION_SUFFIXES.some((suffix) => normalized === suffix || normalized.includes(`${suffix} `) || normalized.includes(` ${suffix}`));
}

function splitStructuredTitle(title) {
  return title
    .split(/\s+[|]\s+|\s+[-—–]\s+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
}

function extractRoleCompanyFromTitle(rawTitle, parserKey, forcedCompany = '') {
  const title = stripSearchSourceSuffix(rawTitle, parserKey);

  if (forcedCompany) {
    const parts = splitStructuredTitle(title).filter((part) => foldText(part) !== foldText(forcedCompany));
    return {
      role: cleanRoleToken(parts[0] || title),
      company: forcedCompany,
      location: parts.find((part) => looksLikeLocationSegment(part)) || '',
    };
  }

  for (const pattern of SEARCH_TITLE_PATTERNS) {
    const match = title.match(pattern);
    if (match?.groups?.role && match?.groups?.company) {
      return {
        role: cleanRoleToken(match.groups.role),
        company: cleanCompanyToken(match.groups.company),
        location: '',
      };
    }
  }

  const parts = splitStructuredTitle(title);
  if (parts.length >= 3 && looksLikeLocationSegment(parts[2])) {
    return {
      role: cleanRoleToken(parts[0]),
      company: cleanCompanyToken(parts[1]),
      location: parts[2],
    };
  }

  if (parts.length >= 2) {
    return {
      role: cleanRoleToken(parts[0]),
      company: cleanCompanyToken(parts[1]),
      location: parts.slice(2).find((part) => looksLikeLocationSegment(part)) || '',
    };
  }

  return {
    role: cleanRoleToken(title),
    company: '',
    location: '',
  };
}

function guessCompanyFromUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host.includes('greenhouse')) {
      return cleanCompanyToken(parsed.pathname.split('/').filter(Boolean)[0] || '');
    }
    if (host.includes('ashbyhq.com')) {
      return cleanCompanyToken(parsed.pathname.split('/').filter(Boolean)[0] || '');
    }
    if (host.includes('lever.co')) {
      return cleanCompanyToken(parsed.pathname.split('/').filter(Boolean)[0] || '');
    }
    if (!/linkedin|indeed|eleman|secretcv|yenibiris|iskur|kariyer/.test(host)) {
      return cleanCompanyToken(host.split('.')[0]);
    }
  } catch {
    return '';
  }
  return '';
}

export function normalizeSearchResult(result, queryConfig, options = {}) {
  const parserKey = queryConfig.parser_key || 'kariyernet_search';
  const profile = sourceProfileFor(parserKey, queryConfig.adapter_family);
  const forcedCompany = options.companyName || queryConfig.company_name || '';
  const extracted = extractRoleCompanyFromTitle(result.title, parserKey, forcedCompany);
  const role = extracted.role;
  const company = cleanCompanyToken(extracted.company || forcedCompany || guessCompanyFromUrl(result.url));

  if (!role || !company) {
    return null;
  }

  return {
    title: role,
    url: result.url,
    company,
    location: extracted.location || '',
    parserKey,
    source: profile.source,
    sourceType: profile.sourceType,
    sourcePriority: profile.priority,
    queryName: queryConfig.name || profile.source,
    requiresLivenessCheck: true,
    discoveryMethod: 'websearch_result',
    adapterFamily: queryConfig.adapter_family || 'turkish_job_board',
  };
}

export function dedupeOffers(offers) {
  const keptByUrl = new Map();
  const keptByIdentity = new Map();
  const duplicates = [];

  function comparePriority(a, b) {
    if (a.sourcePriority !== b.sourcePriority) return a.sourcePriority - b.sourcePriority;
    if (a.sourceType === 'company_careers' && b.sourceType !== 'company_careers') return 1;
    if (b.sourceType === 'company_careers' && a.sourceType !== 'company_careers') return -1;
    return b.url.length - a.url.length;
  }

  for (const offer of offers) {
    const identityKey = makeCompanyRoleKey(offer.company, offer.title);
    const existingByUrl = keptByUrl.get(offer.url);
    if (existingByUrl) {
      duplicates.push(offer);
      continue;
    }

    const existingByIdentity = keptByIdentity.get(identityKey);
    if (!existingByIdentity) {
      keptByUrl.set(offer.url, offer);
      keptByIdentity.set(identityKey, offer);
      continue;
    }

    if (comparePriority(offer, existingByIdentity) > 0) {
      keptByUrl.delete(existingByIdentity.url);
      keptByUrl.set(offer.url, offer);
      keptByIdentity.set(identityKey, offer);
      duplicates.push(existingByIdentity);
      continue;
    }

    duplicates.push(offer);
  }

  return { offers: [...keptByIdentity.values()], duplicates };
}

export function findMissingTrPrimarySources(config) {
  const queries = Array.isArray(config?.search_queries) ? config.search_queries : [];
  const parserKeys = new Set(queries.map((query) => query?.parser_key).filter(Boolean));
  return PRIMARY_TR_PARSER_KEYS.filter((parserKey) => !parserKeys.has(parserKey));
}

function isLikelyTurkeyConfig(config) {
  const queries = Array.isArray(config?.search_queries) ? config.search_queries : [];
  const companies = Array.isArray(config?.tracked_companies) ? config.tracked_companies : [];

  return queries.some((query) => {
    const locale = String(query?.locale || '');
    const parserKey = String(query?.parser_key || '');
    const name = String(query?.name || '');
    const queryText = String(query?.query || '');
    return (
      KNOWN_TR_PARSER_KEYS.has(parserKey) ||
      locale.startsWith('tr') ||
      locale.endsWith('-TR') ||
      /turk|türk|turkiye|türkiye|istanbul|ankara|izmir/i.test(`${name} ${queryText}`)
    );
  }) || companies.some((company) => /turkiye|türkiye|istanbul|ankara|izmir|papara|trendyol|hepsiburada|iyzico/i.test(String(company?.name || '') + ' ' + String(company?.locale || '')));
}

async function parallelMap(items, limit, mapper) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      results.push(await mapper(current));
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => worker()));
  return results;
}

async function runSearchQuery(queryConfig, titleFilter) {
  const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(queryConfig.query)}`;
  const html = await fetchText(url);
  const rawResults = parseSearchResultsHtml(html);
  const offers = [];
  const history = [];
  const firstSeen = new Date().toISOString().slice(0, 10);

  for (const rawResult of rawResults) {
    const normalized = normalizeSearchResult(rawResult, queryConfig);
    if (!normalized) continue;

    if (!titleFilter(normalized.title)) {
      history.push({
        url: normalized.url,
        firstSeen,
        portal: queryConfig.name,
        title: normalized.title,
        company: normalized.company,
        status: 'skipped_title',
      });
      continue;
    }

    offers.push(normalized);
  }

  return { offers, history };
}

async function scanTrackedCompanyApi(company, titleFilter) {
  const api = detectApi(company);
  if (!api) return { offers: [], history: [], errors: [] };

  try {
    const json = await fetchJson(api.url);
    const parser = API_PARSERS[api.type];
    const parserKey = company.parser_key || `${api.type}_board`;
    const offers = parser(json, company, parserKey).filter((offer) => titleFilter(offer.title));
    const firstSeen = new Date().toISOString().slice(0, 10);
    const history = parser(json, company, parserKey)
      .filter((offer) => !titleFilter(offer.title))
      .map((offer) => ({
        url: offer.url,
        firstSeen,
        portal: company.name,
        title: offer.title,
        company: offer.company,
        status: 'skipped_title',
      }));
    return { offers, history, errors: [] };
  } catch (error) {
    return {
      offers: [],
      history: [],
      errors: [{ source: company.name, error: error.message }],
    };
  }
}

function looksLikeJobHref(href) {
  return /\/(job|jobs|career|careers|positions|openings|vacancy|vacancies|opportunities)\b/i.test(href)
    || /greenhouse|ashbyhq|lever|workable|teamtailor/i.test(href);
}

async function scanCompanyCareersPage(browser, company, titleFilter) {
  const page = await browser.newPage();
  try {
    await page.goto(company.careers_url, { waitUntil: 'domcontentloaded', timeout: CAREERS_PAGE_TIMEOUT_MS });
    await page.waitForTimeout(CAREERS_PAGE_WAIT_MS);

    const rawItems = await page.evaluate(() => {
      const rows = [];
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      for (const anchor of anchors) {
        const title = (anchor.innerText || anchor.getAttribute('aria-label') || anchor.textContent || '').replace(/\s+/g, ' ').trim();
        const href = anchor.href || '';
        const container = anchor.closest('li, article, section, div, tr');
        const context = (container?.innerText || '').replace(/\s+/g, ' ').trim();
        if (!title || !href) continue;
        rows.push({ title, href, context });
      }
      return rows;
    });

    const offers = [];
    const history = [];
    const seen = new Set();
    const firstSeen = new Date().toISOString().slice(0, 10);

    for (const item of rawItems) {
      if (!looksLikeJobHref(item.href)) continue;
      const title = normalizeCompanyListingTitle(item.title);
      if (!title || seen.has(`${item.href}::${title}`)) continue;
      seen.add(`${item.href}::${title}`);

      if (!titleFilter(title)) {
        history.push({
          url: item.href,
          firstSeen,
          portal: company.name,
          title,
          company: company.name,
          status: 'skipped_title',
        });
        continue;
      }

      offers.push({
        title,
        url: item.href,
        company: company.name,
        location: '',
        parserKey: company.parser_key || 'custom_careers_hub',
        source: 'Company Careers',
        sourceType: 'company_careers',
        sourcePriority: sourceProfileFor(company.parser_key || 'custom_careers_hub').priority,
        queryName: company.name,
        requiresLivenessCheck: false,
        discoveryMethod: 'playwright_snapshot',
        adapterFamily: company.adapter_family || 'company_careers',
      });
    }

    return { offers, history, errors: [] };
  } catch (error) {
    return {
      offers: [],
      history: [],
      errors: [{ source: company.name, error: error.message }],
    };
  } finally {
    await page.close();
  }
}

async function scanTrackedCompanyWebsearch(company, titleFilter) {
  if (!company.scan_query) {
    return { offers: [], history: [], errors: [] };
  }

  try {
    const result = await runSearchQuery({
      name: company.name,
      query: company.scan_query,
      parser_key: company.parser_key || 'custom_careers_hub',
      adapter_family: company.adapter_family || 'company_careers',
      company_name: company.name,
    }, titleFilter);

    for (const offer of result.offers) {
      offer.sourcePriority = sourceProfileFor(company.parser_key || 'custom_careers_hub').priority;
      offer.source = 'Company Careers';
      offer.sourceType = 'company_careers';
    }

    return { ...result, errors: [] };
  } catch (error) {
    return {
      offers: [],
      history: [],
      errors: [{ source: company.name, error: error.message }],
    };
  }
}

function shouldUseWebsearchForCompany(company) {
  return company.scan_method === 'websearch' && company.scan_query;
}

async function verifySearchOffers(browser, offers, existingUrlSet, existingCompanyRoleSet) {
  const needsLivenessPage = offers.some((offer) => offer.requiresLivenessCheck);
  const page = needsLivenessPage ? await browser.newPage() : null;
  const added = [];
  const history = [];
  const firstSeen = new Date().toISOString().slice(0, 10);

  try {
    for (const offer of offers) {
      if (existingUrlSet.has(offer.url) || existingCompanyRoleSet.has(makeCompanyRoleKey(offer.company, offer.title))) {
        history.push({
          url: offer.url,
          firstSeen,
          portal: offer.queryName,
          title: offer.title,
          company: offer.company,
          status: 'skipped_dup',
        });
        continue;
      }

      if (!offer.requiresLivenessCheck) {
        existingUrlSet.add(offer.url);
        existingCompanyRoleSet.add(makeCompanyRoleKey(offer.company, offer.title));
        added.push(offer);
        continue;
      }

      if (offer.requiresLivenessCheck) {
        const liveness = await checkUrl(page, offer.url);
        if (liveness.result === 'expired') {
          history.push({
            url: offer.url,
            firstSeen,
            portal: offer.queryName,
            title: offer.title,
            company: offer.company,
            status: 'skipped_expired',
          });
          continue;
        }

        if (liveness.result === 'blocked') {
          history.push({
            url: offer.url,
            firstSeen,
            portal: offer.queryName,
            title: offer.title,
            company: offer.company,
            status: 'skipped_blocked_source',
          });
          continue;
        }
      }

      existingUrlSet.add(offer.url);
      existingCompanyRoleSet.add(makeCompanyRoleKey(offer.company, offer.title));
      added.push(offer);
    }

    return { offers: added, history };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

function summarizeWarnings(config) {
  const warnings = [];
  if (isLikelyTurkeyConfig(config)) {
    const missingPrimarySources = findMissingTrPrimarySources(config);
    if (missingPrimarySources.length > 0) {
      warnings.push(
        `portals.yml is missing primary Turkey search parsers: ${missingPrimarySources.join(', ')}. Keep your custom file, but merge the missing entries from templates/portals.tr.example.yml if you want the full Turkey starter coverage.`
      );
    }
  }
  return warnings;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyFlag = args.indexOf('--company');
  const filterCompany = companyFlag !== -1 ? String(args[companyFlag + 1] || '').toLowerCase() : '';

  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Copy templates/portals.tr.example.yml for the Turkey locale starter or templates/portals.example.yml for the global starter.');
    process.exit(1);
  }

  ensureDataFiles();

  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8')) || {};
  const titleFilter = buildTitleFilter(config.title_filter);
  const warnings = summarizeWarnings(config);
  const existingUrlSet = loadSeenUrls();
  const existingCompanyRoleSet = loadSeenCompanyRoles();
  const trackedCompanies = (config.tracked_companies || [])
    .filter((company) => company.enabled !== false)
    .filter((company) => !filterCompany || company.name.toLowerCase().includes(filterCompany));
  const searchQueries = filterCompany
    ? []
    : (config.search_queries || []).filter((query) => query.enabled !== false);

  const apiCompanies = trackedCompanies.filter((company) => detectApi(company));
  const websearchCompanies = trackedCompanies.filter((company) => !detectApi(company) && shouldUseWebsearchForCompany(company));
  const careersCompanies = trackedCompanies.filter((company) => !detectApi(company) && !shouldUseWebsearchForCompany(company) && company.careers_url);

  const browserNeeded = careersCompanies.length > 0 || websearchCompanies.length > 0 || searchQueries.length > 0;
  const browser = browserNeeded ? await chromium.launch({ headless: true }) : null;

  const historyEntries = [];
  const rawOffers = [];
  const errors = [];
  const date = new Date().toISOString().slice(0, 10);

  try {
    const apiResults = await parallelMap(apiCompanies, API_CONCURRENCY, async (company) => scanTrackedCompanyApi(company, titleFilter));
    for (const result of apiResults) {
      rawOffers.push(...result.offers);
      historyEntries.push(...result.history);
      errors.push(...result.errors);
    }

    if (browser) {
      for (const company of careersCompanies) {
        const result = await scanCompanyCareersPage(browser, company, titleFilter);
        rawOffers.push(...result.offers);
        historyEntries.push(...result.history);
        errors.push(...result.errors);
      }
    }

    const trackedSearchResults = await parallelMap(websearchCompanies, SEARCH_CONCURRENCY, async (company) => scanTrackedCompanyWebsearch(company, titleFilter));
    for (const result of trackedSearchResults) {
      rawOffers.push(...result.offers);
      historyEntries.push(...result.history);
      errors.push(...result.errors);
    }

    const queryResults = await parallelMap(searchQueries, SEARCH_CONCURRENCY, async (query) => {
      try {
        return await runSearchQuery(query, titleFilter);
      } catch (error) {
        return { offers: [], history: [], error: { source: query.name, error: error.message } };
      }
    });

    for (const result of queryResults) {
      rawOffers.push(...result.offers);
      historyEntries.push(...result.history);
      if (result.error) errors.push(result.error);
    }

    const { offers: dedupedOffers, duplicates } = dedupeOffers(rawOffers);
    const firstSeen = date;
    for (const duplicate of duplicates) {
      historyEntries.push({
        url: duplicate.url,
        firstSeen,
        portal: duplicate.queryName,
        title: duplicate.title,
        company: duplicate.company,
        status: 'skipped_dup',
      });
    }

    const verificationResult = browser
      ? await verifySearchOffers(browser, dedupedOffers, existingUrlSet, existingCompanyRoleSet)
      : await verifySearchOffers(
          { newPage: async () => { throw new Error('Playwright browser required for liveness checks'); } },
          dedupedOffers,
          existingUrlSet,
          existingCompanyRoleSet,
        );

    const addedOffers = verificationResult.offers;
    historyEntries.push(...verificationResult.history);

    for (const offer of addedOffers) {
      historyEntries.push({
        url: offer.url,
        firstSeen,
        portal: offer.queryName,
        title: offer.title,
        company: offer.company,
        status: 'added',
      });
    }

    if (!dryRun && addedOffers.length > 0) {
      appendToPipeline(addedOffers);
    }
    if (!dryRun) {
      appendHistory(historyEntries);
    }

    const blockedCount = historyEntries.filter((entry) => entry.status === 'skipped_blocked_source').length;
    const expiredCount = historyEntries.filter((entry) => entry.status === 'skipped_expired').length;
    const duplicateCount = historyEntries.filter((entry) => entry.status === 'skipped_dup').length;
    const filteredCount = historyEntries.filter((entry) => entry.status === 'skipped_title').length;

    console.log(`Portal Scan — ${date}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Tracked companies scanned: ${trackedCompanies.length}`);
    console.log(`Search queries run:        ${searchQueries.length + websearchCompanies.length}`);
    console.log(`Candidates found:         ${rawOffers.length}`);
    console.log(`Filtered by title:        ${filteredCount}`);
    console.log(`Duplicates skipped:       ${duplicateCount}`);
    console.log(`Expired skipped:          ${expiredCount}`);
    console.log(`Blocked skipped:          ${blockedCount}`);
    console.log(`New offers added:         ${addedOffers.length}`);

    if (warnings.length > 0) {
      console.log('\nWarnings:');
      for (const warning of warnings) {
        console.log(`  WARN: ${warning}`);
      }
    }

    if (errors.length > 0) {
      console.log('\nErrors:');
      for (const error of errors) {
        console.log(`  ERROR: ${error.source}: ${error.error}`);
      }
    }

    if (addedOffers.length > 0) {
      console.log('\nNew offers:');
      for (const offer of addedOffers) {
        console.log(`  + ${offer.company} | ${offer.title} | ${offer.queryName}`);
      }
      if (!dryRun) {
        console.log(`\nSaved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`);
      }
    }

    if (dryRun) {
      console.log('\n(dry run — no files were written)');
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error('Fatal:', error.message);
    process.exit(1);
  });
}
