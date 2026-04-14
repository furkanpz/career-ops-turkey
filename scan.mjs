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
const SCAN_LATEST_PATH = join(DATA_DIR, 'scan-latest.tsv');
const PIPELINE_PATH = join(DATA_DIR, 'pipeline.md');
const REVIEW_PIPELINE_PATH = join(DATA_DIR, 'review-pipeline.md');
const APPLICATIONS_PATH = existsSync(join(DATA_DIR, 'applications.md'))
  ? join(DATA_DIR, 'applications.md')
  : join(ROOT, 'applications.md');

const FETCH_TIMEOUT_MS = 12_000;
const API_CONCURRENCY = 8;
const SEARCH_CONCURRENCY = 2;
const DEFAULT_SEARCH_RESULT_LIMIT = 8;
const DEFAULT_DIRECT_SEARCH_PAGE_LIMIT = 3;
const CAREERS_PAGE_TIMEOUT_MS = 20_000;
const CAREERS_PAGE_WAIT_MS = 2_000;
const FETCH_RETRY_COUNT = 2;
const FETCH_RETRY_DELAY_MS = 800;
const DUCKDUCKGO_HTML_ENDPOINT = 'https://html.duckduckgo.com/html/';
const BING_SEARCH_ENDPOINT = 'https://www.bing.com/search';
const BLOCKED_PUBLIC_CACHE_DAYS = 3;
const BLOCKED_AUTHWALL_CACHE_DAYS = 7;
const LINKEDIN_ROLE_FAMILY_QUOTA = 8;
const VERIFICATION_BUDGET_MS = 120_000;
const VERIFICATION_TIMEOUTS = {
  discoveryOnly: { timeoutMs: 7_000, waitMs: 1_000 },
  publicBoard: { timeoutMs: 8_500, waitMs: 1_200 },
  companyCareers: { timeoutMs: 11_000, waitMs: 1_500 },
};

const HISTORY_SEEN_STATUSES = new Set([
  'added',
  'review_public_unverified',
  'review_public_unverified_cached',
  'review_review_only',
  'review_blocked_source',
  'review_blocked_source_cached',
  'review_dedup_blocked',
]);

const HISTORY_PUBLIC_BLOCKED_CACHE_STATUSES = new Set([
  'review_public_unverified',
  'review_public_unverified_cached',
  'review_blocked_source',
  'review_blocked_source_cached',
  'review_dedup_blocked',
]);

const HISTORY_AUTHWALL_CACHE_STATUSES = new Set([
  'skipped_authwall_blocked',
  'review_blocked_source',
  'review_blocked_source_cached',
  'skipped_blocked_source',
]);

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

const MERGED_TITLE_LOCATION_SUFFIXES = LOCATION_SUFFIXES.filter((suffix) => !['remote', 'hybrid', 'hibrit', 'uzaktan', 'emea'].includes(suffix));
const CAREERS_NOISE_TITLE_PATTERNS = [
  /^(home(page)?|anasayfa)$/i,
  /^(join us!?|join our team)$/i,
  /^(events?|events page)$/i,
  /^(privacy policy|cookies?|saved jobs|shortlist)$/i,
  /^(apply|başvur|basvur)$/i,
  /^(english|fran[çc]ais|espa[ñn]ol|portugu[eê]s|tr)$/i,
  /^(previous slide|next slide)$/i,
  /^(career|careers|we'?re hiring|our jobs|trendyol tech|early careers?)$/i,
  /^lorem ipsum\d*$/i,
];
const CAREERS_NOISE_HREF_PATTERNS = [
  /#(?:$|open-roles|main-site-main-content)/i,
  /\/(?:privacy|privacy-policy|cookies|saved-jobs?|candidateprivacypolicy|candidateshortlist)(?:[/?#]|$)/i,
  /\/404(?:[/?#]|$)/i,
  /\/Profile\//i,
];
const CAREERS_ROLE_HINT_PATTERNS = [
  /\b(engineer|developer|specialist|consultant|architect|analyst|administrator|owner|designer|scientist|muhendisi|mühendisi|geliştirici|gelistirici|uzmani|uzmanı|yoneticisi|yöneticisi|danismani|danışmanı)\b/i,
  /\b(qa|sre|devops|sap|abap|fiori|database|veritaban[iı]|backend|frontend|full stack|platform|cloud|data|veri|ai|yapay zeka|ml|test|software|yazilim|yazılım|uygulama|application|erp)\b/i,
];
const ROLE_FAMILY_STOPWORDS = new Set([
  'engineer', 'developer', 'specialist', 'consultant', 'architect', 'administrator', 'analyst',
  'software', 'yazilim', 'yazılım', 'muhendisi', 'mühendisi', 'geliştirici', 'gelistirici',
  'uzmani', 'uzmanı', 'yoneticisi', 'yöneticisi', 'danismani', 'danışmanı', 'senior', 'junior',
  'lead', 'principal', 'staff', 'mid', 'core',
]);

const SEARCH_TITLE_PATTERNS = [
  /^(?<role>.+?)\s+@\s+(?<company>.+)$/i,
  /^(?<role>.+?)\s+at\s+(?<company>.+)$/i,
  /^(?<role>.+?)\s+[|]\s+(?<company>.+)$/i,
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

function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function insertCamelSpacing(value) {
  return String(value ?? '')
    .replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2')
    .replace(/([A-ZÇĞİÖŞÜ]{2,})([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)/g, '$1 $2');
}

function stripTags(value) {
  return decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' '));
}

function collapseMatchText(value) {
  return foldText(value).replace(/[^a-z0-9çğıöşü]+/g, '');
}

function normalizePhraseMatchText(value) {
  return normalizeWhitespace(
    insertCamelSpacing(foldText(value))
      .replace(/[^a-z0-9çğıöşü#+./]+/g, ' ')
      .replace(/\s+/g, ' ')
  );
}

function detectSeniorityBucket(value) {
  const normalized = normalizePhraseMatchText(value);
  if (/\b(staff)\b/.test(normalized)) return 'staff';
  if (/\b(principal)\b/.test(normalized)) return 'principal';
  if (/\b(lead|team lead|takim lideri)\b/.test(normalized)) return 'lead';
  if (/\b(senior|sr|kidemli)\b/.test(normalized)) return 'senior';
  if (/\b(mid|middle|orta seviye)\b/.test(normalized)) return 'mid';
  if (/\b(junior|jr|yeni mezun|new grad)\b/.test(normalized)) return 'junior';
  return 'core';
}

function normalizeRoleFamilyKey(value) {
  return normalizeRoleTitle(value).replace(/\b(junior|jr|mid|middle|senior|sr|lead|principal|staff|kidemli|orta|seviye|yeni|mezun)\b/g, '').replace(/\s+/g, ' ').trim();
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

function getSourceHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isLinkedInOffer(offer) {
  const host = getSourceHost(offer?.url);
  return offer?.parserKey === 'linkedin_jobs_search' || host.includes('linkedin.com');
}

function isCompanyOwnedOffer(offer) {
  return offer?.sourceType === 'company_careers' || offer?.adapterFamily === 'company_careers';
}

function isDirectBoardOffer(offer) {
  if (isLinkedInOffer(offer)) return false;
  if (isCompanyOwnedOffer(offer)) return true;
  const host = getSourceHost(offer?.url);
  if (/kariyer\.net|indeed\.com|eleman\.net|secretcv\.com|yenibiris\.com|iskur|esube\.iskur/.test(host)) {
    return true;
  }
  return offer?.discoveryMethod === 'direct_board_search';
}

function isLowPriorityPublicOffer(offer) {
  return isLinkedInOffer(offer) || offer?.discoveryMethod === 'websearch_result';
}

function isDiscoveryOnlyOffer(offer) {
  return isLinkedInOffer(offer);
}

function offerPrecedenceTier(offer) {
  if (isCompanyOwnedOffer(offer) && offer?.requiresLivenessCheck === false) return 400;
  if (isCompanyOwnedOffer(offer)) return 320;
  if (isDirectBoardOffer(offer)) return 280;
  if (offer?.sourceType === 'aggregator') return 220;
  if (offer?.sourceType === 'job_board') return 180;
  return 120;
}

function compareOfferPrecedence(left, right) {
  const tierDelta = offerPrecedenceTier(right) - offerPrecedenceTier(left);
  if (tierDelta !== 0) return tierDelta;
  const priorityDelta = (right?.sourcePriority || 0) - (left?.sourcePriority || 0);
  if (priorityDelta !== 0) return priorityDelta;
  return String(left?.url || '').length - String(right?.url || '').length;
}

function sortOffersForVerification(groupOffers) {
  return [...groupOffers].sort(compareOfferPrecedence);
}

function resolveVerificationTiming(offer) {
  if (isDiscoveryOnlyOffer(offer)) return VERIFICATION_TIMEOUTS.discoveryOnly;
  if (isCompanyOwnedOffer(offer)) return VERIFICATION_TIMEOUTS.companyCareers;
  return VERIFICATION_TIMEOUTS.publicBoard;
}

function makeReviewTags(offer, baseTags = []) {
  const tags = [];
  for (const tag of baseTags) {
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  if (offer?.reviewReason && !tags.includes(offer.reviewReason)) {
    tags.push(offer.reviewReason);
  }
  return tags;
}

function formatReviewReason(offer, baseTags = []) {
  return makeReviewTags(offer, baseTags).join('; ');
}

function reviewSectionForReason(reason = '') {
  return String(reason).includes('public_unverified') ? 'unverified_public' : 'review_only';
}

function normalizeReviewReasonTags(value = '') {
  const normalized = String(value || '')
    .split(';')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .flatMap((part) => {
      if (/^blocked_source(?:_cached)?$/i.test(part)) return ['authwall_blocked'];
      if (/^review_only$/i.test(part)) return ['review_only:matched_title'];
      return [part];
    });

  const unique = [];
  for (const tag of normalized) {
    if (!unique.includes(tag)) unique.push(tag);
  }
  return unique;
}

export function normalizeLegacyReviewEntryReason(reason = '') {
  const tags = normalizeReviewReasonTags(reason);
  if (tags.length === 0) return '';
  const canonical = [];

  const reviewOnlyTags = tags.filter((tag) => tag.startsWith('review_only:'));
  const publicTag = tags.includes('public_unverified') ? 'public_unverified' : '';
  const authwallTag = tags.includes('authwall_blocked') ? 'authwall_blocked' : '';

  if (publicTag) canonical.push(publicTag);
  canonical.push(...reviewOnlyTags);
  if (!publicTag && authwallTag) canonical.push(authwallTag);

  return canonical.join('; ');
}

export function shouldKeepVisibleReviewReason(reason = '') {
  const tags = normalizeReviewReasonTags(reason);
  return tags.includes('public_unverified') || tags.some((tag) => tag.startsWith('review_only:'));
}

function roleFamilyTokens(value = '') {
  return normalizePhraseMatchText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !ROLE_FAMILY_STOPWORDS.has(token));
}

function roleFamilySimilarity(left, right) {
  const leftTokens = new Set(roleFamilyTokens(left));
  const rightTokens = new Set(roleFamilyTokens(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

export function isLikelyCareersNoiseEntry(item = {}) {
  const title = normalizeWhitespace(item.title || '');
  const href = String(item.href || '');
  const context = normalizeWhitespace(item.context || '');
  if (!title || !href) return true;

  if (CAREERS_NOISE_TITLE_PATTERNS.some((pattern) => pattern.test(title))) return true;
  if (CAREERS_NOISE_HREF_PATTERNS.some((pattern) => pattern.test(href))) return true;
  if (!looksLikeJobHref(href)) return true;

  const combined = `${title} ${context}`;
  return !CAREERS_ROLE_HINT_PATTERNS.some((pattern) => pattern.test(combined));
}

function groupHasCurrentRunDirectCandidate(groupOffers = []) {
  return groupOffers.some((offer) => !isDiscoveryOnlyOffer(offer));
}

function buildDirectPromotionIndex(groups) {
  const index = new Map();
  for (const groupOffers of groups.values()) {
    for (const offer of groupOffers) {
      if (isDiscoveryOnlyOffer(offer)) continue;
      const companyKey = normalizeCompanyKey(offer.company);
      const list = index.get(companyKey) || [];
      list.push(offer);
      index.set(companyKey, list);
    }
  }
  return index;
}

export function findDirectPromotionCandidate(groupOffers, promotionIndex, existingUrlSet) {
  const discoveryCandidate = groupOffers.find((offer) => isDiscoveryOnlyOffer(offer));
  if (!discoveryCandidate) return null;

  const companyKey = normalizeCompanyKey(discoveryCandidate.company);
  const candidates = promotionIndex.get(companyKey) || [];
  const discoveryRoleFamily = discoveryCandidate.roleFamilyKey || normalizeRoleFamilyKey(discoveryCandidate.title);
  const discoverySeniority = detectSeniorityBucket(discoveryCandidate.title);
  let best = null;

  for (const candidate of candidates) {
    if (candidate.identityKey === discoveryCandidate.identityKey) continue;
    if (existingUrlSet.has(candidate.canonicalUrl || canonicalizeOfferUrl(candidate.url))) continue;

    const candidateSeniority = detectSeniorityBucket(candidate.title);
    if (!(candidateSeniority === discoverySeniority || candidateSeniority === 'core' || discoverySeniority === 'core')) {
      continue;
    }

    const candidateRoleFamily = candidate.roleFamilyKey || normalizeRoleFamilyKey(candidate.title);
    let score = 0;
    if (candidateRoleFamily === discoveryRoleFamily) {
      score = 1;
    } else {
      score = roleFamilySimilarity(candidateRoleFamily, discoveryRoleFamily);
    }

    if (score < 0.6) continue;
    if (!best || score > best.score || (score === best.score && compareOfferPrecedence(candidate, best.offer) < 0)) {
      best = { offer: candidate, score };
    }
  }

  return best?.offer || null;
}

export function buildTitleFilter(titleFilter) {
  const matcher = buildTitleMatcher(titleFilter);
  return (title) => matcher(title).bucket !== 'reject';
}

function buildTitleTokenEntries(tokens, category, bucket) {
  return (Array.isArray(tokens) ? tokens : [])
    .map((token) => String(token ?? '').trim())
    .filter(Boolean)
    .map((token) => {
      const normalized = normalizePhraseMatchText(token);
      const collapsed = collapseMatchText(token);
      const escaped = escapeRegex(normalized).replace(/\s+/g, '\\s+');
      const exactPattern = new RegExp(`(^|[^a-z0-9çğıöşü])${escaped}($|[^a-z0-9çğıöşü])`, 'i');
      return {
        token,
        normalized,
        collapsed: collapsed.length >= 6 ? collapsed : '',
        category,
        bucket,
        exactPattern,
      };
    })
    .sort((left, right) => right.normalized.length - left.normalized.length);
}

function buildTitleClassifierConfig(titleFilter = {}) {
  const hasStructuredConfig =
    titleFilter?.include ||
    titleFilter?.review_only ||
    titleFilter?.exclude;

  if (hasStructuredConfig) {
    return {
      includeExact: buildTitleTokenEntries(titleFilter?.include?.exact_only, 'include_exact_only', 'main'),
      includeFamily: buildTitleTokenEntries(titleFilter?.include?.family_contains, 'include_family_contains', 'main'),
      reviewExact: buildTitleTokenEntries(titleFilter?.review_only?.exact_only, 'review_exact_only', 'review'),
      reviewFamily: buildTitleTokenEntries(titleFilter?.review_only?.family_contains, 'review_family_contains', 'review'),
      excludeExact: buildTitleTokenEntries(titleFilter?.exclude?.exact_only, 'exclude_exact_only', 'reject'),
      excludeFamily: buildTitleTokenEntries(titleFilter?.exclude?.family_contains, 'exclude_family_contains', 'reject'),
    };
  }

  return {
    includeExact: [],
    includeFamily: buildTitleTokenEntries(titleFilter?.positive, 'include_family_contains', 'main'),
    reviewExact: [],
    reviewFamily: [],
    excludeExact: [],
    excludeFamily: buildTitleTokenEntries(titleFilter?.negative, 'exclude_family_contains', 'reject'),
  };
}

function findTitleMatch(entries, normalizedTitle, collapsedTitle, exactOnly = false) {
  for (const entry of entries) {
    if (entry.exactPattern.test(normalizedTitle)) {
      return entry;
    }
    if (!exactOnly && entry.normalized && normalizedTitle.includes(entry.normalized)) {
      return entry;
    }
    if (!exactOnly && entry.collapsed && collapsedTitle.includes(entry.collapsed)) {
      return entry;
    }
  }
  return null;
}

export function buildTitleMatcher(titleFilter) {
  const config = buildTitleClassifierConfig(titleFilter);

  return (title) => {
    const normalizedTitle = normalizePhraseMatchText(title);
    const collapsedTitle = collapseMatchText(title);

    const excludeMatch = findTitleMatch(config.excludeExact, normalizedTitle, collapsedTitle, true)
      || findTitleMatch(config.excludeFamily, normalizedTitle, collapsedTitle, false);
    if (excludeMatch) {
      return {
        bucket: 'reject',
        category: excludeMatch.category,
        matchedToken: excludeMatch.token,
        roleFamilyKey: '',
      };
    }

    const includeMatch = findTitleMatch(config.includeExact, normalizedTitle, collapsedTitle, true)
      || findTitleMatch(config.includeFamily, normalizedTitle, collapsedTitle, false);
    if (includeMatch) {
      return {
        bucket: 'main',
        category: includeMatch.category,
        matchedToken: includeMatch.token,
        roleFamilyKey: normalizeRoleFamilyKey(includeMatch.token || title),
      };
    }

    const reviewMatch = findTitleMatch(config.reviewExact, normalizedTitle, collapsedTitle, true)
      || findTitleMatch(config.reviewFamily, normalizedTitle, collapsedTitle, false);
    if (reviewMatch) {
      return {
        bucket: 'review',
        category: reviewMatch.category,
        matchedToken: reviewMatch.token,
        reviewReason: `review_only:${reviewMatch.token}`,
        roleFamilyKey: normalizeRoleFamilyKey(reviewMatch.token || title),
      };
    }

    return {
      bucket: 'reject',
      category: 'no_match',
      matchedToken: '',
      roleFamilyKey: '',
    };
  };
}

function resolveSearchResultLimit(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_SEARCH_RESULT_LIMIT;
  }
  return Math.min(parsed, 50);
}

function resolveDirectSearchPageLimit(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_DIRECT_SEARCH_PAGE_LIMIT;
  }
  return Math.min(parsed, 10);
}

function sanitizeXmlText(value) {
  return normalizeWhitespace(decodeHtmlEntities(String(value ?? '').replace(/<!\[CDATA\[|\]\]>/g, ' ')));
}

function looksLikeHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim());
}

function toAbsoluteUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return String(url ?? '');
  }
}

function normalizeKariyerPath(pathname) {
  return pathname.replace(/-\d+$/, '');
}

function appendUniqueUrl(target, seen, url) {
  if (!looksLikeHttpUrl(url) || seen.has(url)) return;
  seen.add(url);
  target.push(url);
}

export function expandDirectSearchUrls(queryConfig, pageLimit = DEFAULT_DIRECT_SEARCH_PAGE_LIMIT) {
  const seeds = searchUrlCandidatesFor(queryConfig);
  const limit = resolveDirectSearchPageLimit(pageLimit);
  const urls = [];
  const seen = new Set();
  const paginationType = String(queryConfig?.pagination?.type || '');
  const pageSize = Number.parseInt(String(queryConfig?.pagination?.page_size ?? 25), 10) || 25;

  for (const seed of seeds) {
    appendUniqueUrl(urls, seen, seed);

    if (limit <= 1) continue;

    try {
      const parsed = new URL(seed);

      if (paginationType === 'linkedin_start') {
        const baseStart = Number.parseInt(parsed.searchParams.get('start') || '0', 10) || 0;
        for (let pageIndex = 1; pageIndex < limit; pageIndex++) {
          const nextUrl = new URL(parsed.toString());
          nextUrl.searchParams.set('start', String(baseStart + pageIndex * pageSize));
          appendUniqueUrl(urls, seen, nextUrl.toString());
        }
        continue;
      }

      if (paginationType === 'kariyer_path') {
        const basePath = normalizeKariyerPath(parsed.pathname);
        for (let pageIndex = 2; pageIndex <= limit; pageIndex++) {
          const nextUrl = new URL(parsed.toString());
          nextUrl.pathname = `${basePath}-${pageIndex}`;
          appendUniqueUrl(urls, seen, nextUrl.toString());
        }
      }
    } catch {
      continue;
    }
  }

  return urls;
}

function isLikelyJobUrl(url, parserKey = '', adapterFamily = '') {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname.toLowerCase();
    const normalizedParserKey = String(parserKey || '');

    if (host.includes('linkedin.com')) return path.includes('/jobs/view/');
    if (host.includes('kariyer.net')) return path.includes('/is-ilani/');
    if (host.includes('indeed.com')) return path.includes('/viewjob') || path.includes('/jobs');
    if (host.includes('eleman.net')) return path.includes('/is-ilani/');
    if (host.includes('yenibiris.com')) return path.includes('/is-ilanlari/');
    if (host.includes('secretcv.com')) return path.includes('/is-ilanlari/');
    if (host.includes('iskur') || host.includes('esube.iskur')) return path.includes('ilan') || path.includes('job');
    if (host.includes('greenhouse') || host.includes('ashbyhq.com') || host.includes('lever.co') || host.includes('workable.com') || host.includes('teamtailor')) {
      return /\/(jobs?|job-boards?|careers?|openings?)/.test(path);
    }
    if (adapterFamily === 'company_careers') return /\/(jobs?|careers?|open-positions|positions|openings?)/.test(path);
    if (normalizedParserKey.endsWith('_search')) return /\/(jobs?|job|is-ilani|is-ilanlari|careers?|positions|openings?)/.test(path);
    return true;
  } catch {
    return false;
  }
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFetchError(error) {
  if (!error) return false;

  const message = String(error.message || '');
  if (error.name === 'AbortError') return true;
  if (/This operation was aborted/i.test(message)) return true;
  if (/fetch failed/i.test(message)) return true;
  if (/HTTP 429/i.test(message)) return true;
  if (/HTTP 5\d\d/i.test(message)) return true;
  return false;
}

async function fetchWithRetry(url, responseType, extra = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= FETCH_RETRY_COUNT; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...makeFetchOptions(extra), signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return responseType === 'json' ? await response.json() : await response.text();
    } catch (error) {
      lastError = error;
      if (attempt === FETCH_RETRY_COUNT || !isRetryableFetchError(error)) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }

    await sleep(FETCH_RETRY_DELAY_MS * (attempt + 1));
  }

  throw lastError;
}

async function fetchText(url, extra = {}) {
  return fetchWithRetry(url, 'text', extra);
}

async function fetchJson(url, extra = {}) {
  return fetchWithRetry(url, 'json', extra);
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
  if (!existsSync(REVIEW_PIPELINE_PATH)) {
    writeFileSync(REVIEW_PIPELINE_PATH, '# Review Queue\n\n## Unverified Public Matches\n\n## Review-Only Matches\n\n', 'utf-8');
  }
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n', 'utf-8');
  }
  if (!existsSync(SCAN_LATEST_PATH)) {
    writeFileSync(SCAN_LATEST_PATH, 'run_id\turl\tfirst_seen\tportal\ttitle\tcompany\tstatus\tbucket\treason\tsource_host\n', 'utf-8');
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

function parseReviewPipelineEntries(text) {
  const entries = [];
  let section = 'review_only';

  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '## Unverified Public Matches') {
      section = 'unverified_public';
      continue;
    }
    if (trimmed === '## Review-Only Matches' || trimmed === '## Needs Manual Check') {
      section = 'review_only';
      continue;
    }

    const match = line.match(/^- \[([ x])\] (\S+) \| ([^|]+) \| ([^|]+?)(?: \| (.+))?$/);
    if (!match) continue;
    const reviewReason = normalizeLegacyReviewEntryReason(match[5] || '');
    entries.push({
      checked: match[1] === 'x',
      url: match[2].trim(),
      company: match[3].trim(),
      title: match[4].trim(),
      reviewReason,
      section: shouldKeepVisibleReviewReason(reviewReason) ? reviewSectionForReason(reviewReason) : 'hidden',
    });
  }

  return entries;
}

export function mergeReviewQueueEntries(existingEntries, newOffers) {
  const existingByKey = new Map();
  const merged = {
    unverified_public: [],
    review_only: [],
  };
  const seen = new Set();

  for (const entry of existingEntries) {
    if (!shouldKeepVisibleReviewReason(entry.reviewReason)) continue;
    existingByKey.set(makeCompanyRoleKey(entry.company, entry.title), entry);
  }

  for (const offer of newOffers) {
    const key = makeCompanyRoleKey(offer.company, offer.title);
    if (seen.has(key)) continue;
    const existing = existingByKey.get(key);
    seen.add(key);
    const reviewReason = normalizeLegacyReviewEntryReason(offer.reviewReason || existing?.reviewReason || '');
    if (!shouldKeepVisibleReviewReason(reviewReason)) continue;
    const section = reviewSectionForReason(reviewReason);
    merged[section].push({
      checked: existing?.checked || false,
      url: offer.url,
      company: offer.company,
      title: offer.title,
      reviewReason,
      section,
    });
  }

  for (const entry of existingEntries) {
    const key = makeCompanyRoleKey(entry.company, entry.title);
    if (seen.has(key)) continue;
    seen.add(key);
    const reviewReason = normalizeLegacyReviewEntryReason(entry.reviewReason || '');
    if (!shouldKeepVisibleReviewReason(reviewReason)) continue;
    const section = entry.section === 'hidden' ? reviewSectionForReason(reviewReason) : (entry.section || reviewSectionForReason(reviewReason));
    merged[section].push({
      ...entry,
      reviewReason,
      section,
    });
  }

  return merged;
}

function renderReviewQueue(mergedEntries) {
  const sections = [
    ['Unverified Public Matches', mergedEntries.unverified_public || []],
    ['Review-Only Matches', mergedEntries.review_only || []],
  ];

  const blocks = ['# Review Queue'];
  for (const [heading, entries] of sections) {
    blocks.push('', `## ${heading}`, '');
    if (entries.length > 0) {
      blocks.push(...entries.map((entry) => `- [${entry.checked ? 'x' : ' '}] ${entry.url} | ${entry.company} | ${entry.title} | ${entry.reviewReason}`));
      blocks.push('');
    }
  }

  return `${blocks.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

function appendToReviewPipeline(offers) {
  ensureDataFiles();
  const current = existsSync(REVIEW_PIPELINE_PATH) ? readFileSync(REVIEW_PIPELINE_PATH, 'utf-8') : '';
  const existingEntries = parseReviewPipelineEntries(current);
  const mergedEntries = mergeReviewQueueEntries(existingEntries, offers);
  writeFileSync(REVIEW_PIPELINE_PATH, renderReviewQueue(mergedEntries), 'utf-8');
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

function deriveLatestHistoryBucket(status = '') {
  if (status === 'added') return 'main';
  if (status.startsWith('review_')) return 'review';
  if (status === 'skipped_title') return 'reject';
  if (status === 'skipped_dup') return 'duplicate';
  if (status === 'skipped_expired') return 'expired';
  if (status.includes('blocked')) return 'dropped';
  return 'info';
}

function deriveLatestHistoryReason(entry = {}) {
  if (entry.reason) return entry.reason;
  switch (entry.status) {
    case 'review_public_unverified':
    case 'review_public_unverified_cached':
    case 'review_blocked_source':
    case 'review_blocked_source_cached':
      return 'public_unverified';
    case 'review_review_only':
      return 'review_only';
    case 'skipped_authwall_blocked':
    case 'skipped_blocked_source':
      return 'authwall_blocked';
    default:
      return '';
  }
}

export function buildLatestHistoryTsv(entries, runId) {
  const header = 'run_id\turl\tfirst_seen\tportal\ttitle\tcompany\tstatus\tbucket\treason\tsource_host\n';
  if (entries.length === 0) {
    return header;
  }

  const lines = entries.map((entry) => [
    runId,
    entry.url,
    entry.firstSeen,
    entry.portal,
    entry.title,
    entry.company,
    entry.status,
    entry.bucket || deriveLatestHistoryBucket(entry.status),
    deriveLatestHistoryReason(entry),
    entry.sourceHost || getSourceHost(entry.url),
  ].join('\t'));
  return `${header}${lines.join('\n')}\n`;
}

function writeLatestHistory(entries, runId) {
  ensureDataFiles();
  writeFileSync(SCAN_LATEST_PATH, buildLatestHistoryTsv(entries, runId), 'utf-8');
}

function canonicalizeOfferUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host.includes('linkedin.com') && parsed.pathname.includes('/jobs/view/')) {
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    }

    if (
      host.includes('kariyer.net') ||
      host.includes('greenhouse') ||
      host.includes('ashbyhq.com') ||
      host.includes('lever.co') ||
      host.includes('workable.com') ||
      host.includes('teamtailor')
    ) {
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    }

    for (const key of [...parsed.searchParams.keys()]) {
      if (
        key.startsWith('utm_') ||
        ['refid', 'trackingid', 'trk', 'originalsubdomain', 'page', 'pagenum', 'position', 'index', 'start'].includes(key.toLowerCase())
      ) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return String(url ?? '').trim();
  }
}

function loadChecklistOffers(path, includeReason = false) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf-8');
  const offers = [];

  for (const line of text.split('\n')) {
    const match = line.match(/^- \[[ x]\] (\S+) \| ([^|]+) \| ([^|]+?)(?: \| (.+))?$/);
    if (!match) continue;
    offers.push({
      url: match[1].trim(),
      company: match[2].trim(),
      title: match[3].trim(),
      reviewReason: includeReason ? normalizeWhitespace(match[4] || '') : '',
    });
  }

  return offers;
}

function daysSinceIsoDate(value, todayIso) {
  const start = Date.parse(`${value}T00:00:00Z`);
  const end = Date.parse(`${todayIso}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.POSITIVE_INFINITY;
  return Math.floor((end - start) / 86_400_000);
}

function shouldReplaceHistoryEntry(previous, next) {
  if (!previous) return true;
  return String(next.firstSeen || '') >= String(previous.firstSeen || '');
}

function loadScanHistoryIndex(todayIso = new Date().toISOString().slice(0, 10)) {
  const index = {
    seenUrls: new Set(),
    seenCompanyRoles: new Set(),
    publicBlockedByUrl: new Map(),
    publicBlockedByIdentity: new Map(),
    authwallBlockedByUrl: new Map(),
    authwallBlockedByIdentity: new Map(),
  };

  if (!existsSync(SCAN_HISTORY_PATH)) {
    return index;
  }

  const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n').slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const [url, firstSeen, portal, title, company, status] = line.split('\t');
    if (!url || !title || !company || !status) continue;

    const canonicalUrl = canonicalizeOfferUrl(url);
    const identityKey = makeCompanyRoleKey(company, title);
    const entry = { url, canonicalUrl, firstSeen, portal, title, company, status, identityKey };

    if (HISTORY_SEEN_STATUSES.has(status)) {
      index.seenUrls.add(canonicalUrl);
      index.seenCompanyRoles.add(identityKey);
    }

    if (HISTORY_PUBLIC_BLOCKED_CACHE_STATUSES.has(status) && daysSinceIsoDate(firstSeen, todayIso) <= BLOCKED_PUBLIC_CACHE_DAYS) {
      if (shouldReplaceHistoryEntry(index.publicBlockedByUrl.get(canonicalUrl), entry)) {
        index.publicBlockedByUrl.set(canonicalUrl, entry);
      }
      if (shouldReplaceHistoryEntry(index.publicBlockedByIdentity.get(identityKey), entry)) {
        index.publicBlockedByIdentity.set(identityKey, entry);
      }
    }

    if (HISTORY_AUTHWALL_CACHE_STATUSES.has(status) && daysSinceIsoDate(firstSeen, todayIso) <= BLOCKED_AUTHWALL_CACHE_DAYS) {
      if (shouldReplaceHistoryEntry(index.authwallBlockedByUrl.get(canonicalUrl), entry)) {
        index.authwallBlockedByUrl.set(canonicalUrl, entry);
      }
      if (shouldReplaceHistoryEntry(index.authwallBlockedByIdentity.get(identityKey), entry)) {
        index.authwallBlockedByIdentity.set(identityKey, entry);
      }
    }
  }

  return index;
}

function loadSeenUrls(historyIndex = loadScanHistoryIndex()) {
  const seen = new Set();

  for (const url of historyIndex.seenUrls || []) {
    seen.add(url);
  }

  for (const offer of loadChecklistOffers(PIPELINE_PATH)) {
    seen.add(canonicalizeOfferUrl(offer.url));
  }

  for (const offer of loadChecklistOffers(REVIEW_PIPELINE_PATH, true)) {
    seen.add(canonicalizeOfferUrl(offer.url));
  }

  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(canonicalizeOfferUrl(match[0]));
    }
  }

  return seen;
}

function makeCompanyRoleKey(company, role, roleFamilyKey = '') {
  const normalizedCompany = normalizeCompanyKey(company);
  const seniority = detectSeniorityBucket(role);
  const normalizedRole = roleFamilyKey || normalizeRoleFamilyKey(role) || normalizeRoleTitle(role);
  return `${normalizedCompany}::${seniority}::${normalizedRole}`;
}

function loadSeenCompanyRoles(historyIndex = loadScanHistoryIndex()) {
  const seen = new Set();

  for (const identityKey of historyIndex.seenCompanyRoles || []) {
    seen.add(identityKey);
  }

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

  for (const offer of loadChecklistOffers(PIPELINE_PATH)) {
    seen.add(makeCompanyRoleKey(offer.company, offer.title));
  }

  for (const offer of loadChecklistOffers(REVIEW_PIPELINE_PATH, true)) {
    seen.add(makeCompanyRoleKey(offer.company, offer.title));
  }

  return seen;
}

function extractSearchTargetUrl(href) {
  const decodedHref = decodeHtmlEntities(href).replace(/^\/\//, 'https://');
  if (!decodedHref) return '';

  try {
    const url = new URL(decodedHref, DUCKDUCKGO_HTML_ENDPOINT);
    if (url.hostname.includes('duckduckgo.com') && url.pathname === '/l/') {
      const target = url.searchParams.get('uddg');
      return target ? decodeURIComponent(target) : '';
    }
    return url.toString();
  } catch {
    return decodedHref;
  }
}

export function parseSearchResultsHtml(html, limit = DEFAULT_SEARCH_RESULT_LIMIT) {
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
  return results.slice(0, resolveSearchResultLimit(limit));
}

export function parseBingRssResultsXml(xml, limit = DEFAULT_SEARCH_RESULT_LIMIT) {
  const results = [];
  const seenUrls = new Set();
  const regex = /<item>\s*<title>([\s\S]*?)<\/title>\s*<link>([\s\S]*?)<\/link>/gi;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const title = sanitizeXmlText(match[1]);
    const url = sanitizeXmlText(match[2]);
    if (!title || !url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    results.push({ url, title });
  }

  return results.slice(0, resolveSearchResultLimit(limit));
}

export function parseLinkedInSearchResultsHtml(html, limit = DEFAULT_SEARCH_RESULT_LIMIT) {
  const results = [];
  const seenUrls = new Set();
  const cardRegex = /<div class="base-card[\s\S]*?<\/li>/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const block = match[0];
    const url = decodeHtmlEntities(block.match(/<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"/i)?.[1] || '');
    const title = normalizeWhitespace(stripTags(block.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || ''));
    const company = normalizeWhitespace(stripTags(block.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i)?.[1] || ''));
    const location = normalizeWhitespace(stripTags(block.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || ''));

    if (!url || !title || !company || seenUrls.has(url)) continue;
    seenUrls.add(url);
    results.push({ url, title, company, location });
  }

  return results.slice(0, resolveSearchResultLimit(limit));
}

export function parseKariyerSearchResultsHtml(html, limit = DEFAULT_SEARCH_RESULT_LIMIT) {
  const results = [];
  const seenUrls = new Set();
  const cardRegex = /<div data-test="ad-card"[\s\S]*?<\/a>/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const block = match[0];
    const url = toAbsoluteUrl(decodeHtmlEntities(block.match(/<a href="(\/is-ilani\/[^"]+)"/i)?.[1] || ''), 'https://www.kariyer.net');
    const title = normalizeWhitespace(stripTags(block.match(/<span data-test="ad-card-title"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || ''));
    const company = normalizeWhitespace(stripTags(block.match(/<span data-test="subtitle"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || ''));
    const location = normalizeWhitespace(stripTags(block.match(/<span data-test="location"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || ''));
    if (!url || !title || !company || seenUrls.has(url)) continue;
    seenUrls.add(url);
    results.push({ url, title, company, location });
  }

  return results.slice(0, resolveSearchResultLimit(limit));
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
  );
}

function splitWordsPreservingCase(value) {
  return normalizeWhitespace(value).split(/\s+/).filter(Boolean);
}

function joinLocationParts(parts) {
  return normalizeWhitespace(parts.filter(Boolean).join(' - '));
}

export function normalizeCompanyListingTitle(value) {
  let title = normalizeWhitespace(insertCamelSpacing(value).replace(/\bNEW\b/gi, ' ').replace(/\s+/g, ' '));
  const parts = splitStructuredTitle(title);

  if (parts.length > 1) {
    while (parts.length > 1 && looksLikeLocationSegment(parts[parts.length - 1])) {
      parts.pop();
    }
    title = parts.join(' - ');
  }

  const words = splitWordsPreservingCase(title);
  for (let i = 1; i < words.length; i++) {
    if (MERGED_TITLE_LOCATION_SUFFIXES.includes(foldText(words[i]))) {
      title = words.slice(0, i).join(' ');
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
  if (parts.length >= 3) {
    const nonLocationParts = parts.filter((part) => !looksLikeLocationSegment(part));
    const locationParts = parts.filter((part) => looksLikeLocationSegment(part));

    if (locationParts.length > 0 && nonLocationParts.length >= 2) {
      return {
        role: cleanRoleToken(nonLocationParts.slice(0, -1).join(' - ')),
        company: cleanCompanyToken(nonLocationParts[nonLocationParts.length - 1]),
        location: joinLocationParts(locationParts),
      };
    }
  }

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
      location: joinLocationParts(parts.slice(2).filter((part) => looksLikeLocationSegment(part))),
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

  if (!isLikelyJobUrl(result.url, parserKey, queryConfig.adapter_family)) {
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
  const groups = new Map();
  const duplicates = [];

  for (const offer of offers) {
    const canonicalUrl = offer.canonicalUrl || canonicalizeOfferUrl(offer.url);
    const identityKey = makeCompanyRoleKey(offer.company, offer.title, offer.roleFamilyKey);
    const candidate = { ...offer, canonicalUrl, identityKey };
    const existingByUrl = keptByUrl.get(canonicalUrl);
    if (existingByUrl) {
      duplicates.push(candidate);
      const group = groups.get(identityKey) || [existingByUrl];
      group.push(candidate);
      groups.set(identityKey, group);
      continue;
    }

    const existingByIdentity = keptByIdentity.get(identityKey);
    if (!existingByIdentity) {
      keptByUrl.set(canonicalUrl, candidate);
      keptByIdentity.set(identityKey, candidate);
      groups.set(identityKey, [candidate]);
      continue;
    }

    const group = groups.get(identityKey) || [existingByIdentity];
    group.push(candidate);
    groups.set(identityKey, group);

    if (compareOfferPrecedence(candidate, existingByIdentity) < 0) {
      keptByUrl.delete(existingByIdentity.canonicalUrl || existingByIdentity.url);
      keptByUrl.set(canonicalUrl, candidate);
      keptByIdentity.set(identityKey, candidate);
      duplicates.push(existingByIdentity);
      continue;
    }

    duplicates.push(candidate);
  }

  for (const [identityKey, group] of groups.entries()) {
    groups.set(identityKey, sortOffersForVerification(group));
  }

  return { offers: [...keptByIdentity.values()], duplicates, groups };
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

function searchFetchOptions(providerName) {
  if (providerName === 'bing_rss') {
    return makeFetchOptions({
      headers: {
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
      },
    });
  }

  return makeFetchOptions({
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
    },
  });
}

function searchUrlCandidatesFor(queryConfig) {
  const urls = [];
  if (looksLikeHttpUrl(queryConfig.search_url)) urls.push(queryConfig.search_url);
  if (Array.isArray(queryConfig.search_urls)) {
    for (const value of queryConfig.search_urls) {
      if (looksLikeHttpUrl(value)) urls.push(value);
    }
  }
  if (looksLikeHttpUrl(queryConfig.query)) urls.push(queryConfig.query);
  return [...new Set(urls)];
}

function directSearchOfferFactory(queryConfig) {
  const parserKey = queryConfig.parser_key || 'kariyernet_search';
  const profile = sourceProfileFor(parserKey, queryConfig.adapter_family);

  return (result) => ({
    title: normalizeWhitespace(result.title || ''),
    url: result.url || '',
    company: normalizeWhitespace(result.company || ''),
    location: normalizeWhitespace(result.location || ''),
    parserKey,
    source: profile.source,
    sourceType: profile.sourceType,
    sourcePriority: profile.priority,
    queryName: queryConfig.name || profile.source,
    requiresLivenessCheck: true,
    discoveryMethod: 'direct_board_search',
    adapterFamily: queryConfig.adapter_family || 'turkish_job_board',
  });
}

function classifyOffer(offer, titleMatcher) {
  const match = titleMatcher(offer.title);
  return {
    ...offer,
    canonicalUrl: canonicalizeOfferUrl(offer.url),
    matchBucket: match.bucket,
    matchCategory: match.category,
    matchedToken: match.matchedToken || '',
    reviewReason: match.reviewReason || '',
    roleFamilyKey: match.roleFamilyKey || normalizeRoleFamilyKey(offer.title),
  };
}

function applySourceQuotas(offers, history, firstSeen) {
  const kept = [];
  const roleFamilyCounts = new Map();

  for (const offer of offers) {
    if (offer.parserKey === 'linkedin_jobs_search') {
      const roleFamilyKey = offer.roleFamilyKey || normalizeRoleFamilyKey(offer.title);
      const count = roleFamilyCounts.get(roleFamilyKey) || 0;
      if (count >= LINKEDIN_ROLE_FAMILY_QUOTA) {
        history.push({
          url: offer.url,
          firstSeen,
          portal: offer.queryName,
          title: offer.title,
          company: offer.company,
          status: 'skipped_source_quota',
          reason: 'linkedin_role_family_quota',
          bucket: 'dropped',
          sourceHost: getSourceHost(offer.url),
        });
        continue;
      }
      roleFamilyCounts.set(roleFamilyKey, count + 1);
    }

    kept.push(offer);
  }

  return kept;
}

async function runDirectSearchQuery(queryConfig, titleFilter, searchResultLimit = DEFAULT_SEARCH_RESULT_LIMIT) {
  const parserKey = queryConfig.parser_key || 'kariyernet_search';
  const directPageLimit = resolveDirectSearchPageLimit(queryConfig?.pagination?.max_pages ?? queryConfig?.direct_search_page_limit);
  const urls = expandDirectSearchUrls(queryConfig, directPageLimit);
  if (urls.length === 0) {
    return { offers: [], history: [], handled: false };
  }

  const parseDirect = parserKey === 'linkedin_jobs_search'
    ? parseLinkedInSearchResultsHtml
    : parserKey === 'kariyernet_search'
      ? parseKariyerSearchResultsHtml
      : null;

  if (!parseDirect) {
    return { offers: [], history: [], handled: false };
  }

  const offers = [];
  const history = [];
  const firstSeen = new Date().toISOString().slice(0, 10);
  const makeOffer = directSearchOfferFactory(queryConfig);
  let succeeded = false;
  let lastError = null;

  for (const url of urls) {
    try {
      const html = await fetchText(url, searchFetchOptions('direct_board'));
      const results = parseDirect(html, searchResultLimit);
      succeeded = true;

      for (const result of results) {
        const offer = classifyOffer(makeOffer(result), titleFilter);
        if (!offer.title || !offer.company || !offer.url) continue;
        if (offer.matchBucket === 'reject') {
          history.push({
            url: offer.url,
            firstSeen,
            portal: queryConfig.name,
            title: offer.title,
            company: offer.company,
            status: 'skipped_title',
          });
          continue;
        }

        offers.push(offer);
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (!succeeded && lastError) {
    throw lastError;
  }

  return {
    offers: applySourceQuotas(offers, history, firstSeen),
    history,
    handled: succeeded,
  };
}

const SEARCH_PROVIDERS = [
  {
    name: 'duckduckgo_html',
    buildUrl: (query) => `${DUCKDUCKGO_HTML_ENDPOINT}?q=${encodeURIComponent(query)}`,
    parse: parseSearchResultsHtml,
  },
  {
    name: 'bing_rss',
    buildUrl: (query) => `${BING_SEARCH_ENDPOINT}?format=rss&setlang=en&q=${encodeURIComponent(query)}`,
    parse: parseBingRssResultsXml,
  },
];

async function runSearchQuery(queryConfig, titleFilter, searchResultLimit = DEFAULT_SEARCH_RESULT_LIMIT) {
  let directResult = { offers: [], history: [], handled: false };
  let directError = null;

  try {
    directResult = await runDirectSearchQuery(queryConfig, titleFilter, searchResultLimit);
  } catch (error) {
    directError = error;
  }

  if (directResult.handled) {
    return { offers: directResult.offers, history: directResult.history };
  }

  if (!queryConfig.query || looksLikeHttpUrl(queryConfig.query)) {
    if (directError) throw directError;
    return { offers: [], history: [] };
  }

  const offers = [];
  const history = [];
  const firstSeen = new Date().toISOString().slice(0, 10);
  let lastError = directError;

  for (const provider of SEARCH_PROVIDERS) {
    try {
      const url = provider.buildUrl(queryConfig.query);
      const payload = await fetchText(url, searchFetchOptions(provider.name));
      const rawResults = provider.parse(payload, searchResultLimit);

      for (const rawResult of rawResults) {
        const normalized = normalizeSearchResult(rawResult, queryConfig);
        if (!normalized) continue;
        const offer = classifyOffer(normalized, titleFilter);

        if (offer.matchBucket === 'reject') {
          history.push({
            url: offer.url,
            firstSeen,
            portal: queryConfig.name,
            title: offer.title,
            company: offer.company,
            status: 'skipped_title',
          });
          continue;
        }

        offers.push(offer);
      }

      return {
        offers: applySourceQuotas(offers, history, firstSeen),
        history,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Search query failed for ${queryConfig.name}`);
}

async function scanTrackedCompanyApi(company, titleFilter) {
  const api = detectApi(company);
  if (!api) return { offers: [], history: [], errors: [] };

  try {
    const json = await fetchJson(api.url);
    const parser = API_PARSERS[api.type];
    const parserKey = company.parser_key || `${api.type}_board`;
    const classifiedOffers = parser(json, company, parserKey).map((offer) => classifyOffer(offer, titleFilter));
    const offers = classifiedOffers.filter((offer) => offer.matchBucket !== 'reject');
    const firstSeen = new Date().toISOString().slice(0, 10);
    const history = classifiedOffers
      .filter((offer) => offer.matchBucket === 'reject')
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
      if (isLikelyCareersNoiseEntry(item)) continue;
      const title = normalizeCompanyListingTitle(item.title);
      if (!title || seen.has(`${item.href}::${title}`)) continue;
      seen.add(`${item.href}::${title}`);
      const offer = classifyOffer({
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
      }, titleFilter);

      if (offer.matchBucket === 'reject') {
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

      offers.push(offer);
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

async function scanTrackedCompanyWebsearch(company, titleFilter, searchResultLimit = DEFAULT_SEARCH_RESULT_LIMIT) {
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
    }, titleFilter, searchResultLimit);

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

function makeOfferHistoryEntry(offer, status, firstSeen, extra = {}) {
  return {
    url: offer.url,
    firstSeen,
    portal: offer.queryName,
    title: offer.title,
    company: offer.company,
    status,
    bucket: extra.bucket,
    reason: extra.reason,
    sourceHost: extra.sourceHost || getSourceHost(offer.url),
  };
}

function pushGroupDuplicateHistory(history, groupOffers, representative, firstSeen, status = 'skipped_dup') {
  for (const candidate of groupOffers) {
    if (candidate.url === representative.url) continue;
    history.push(makeOfferHistoryEntry(candidate, status, firstSeen));
  }
}

function findBlockedHistoryCache(groupOffers, identityKey, historyIndex) {
  if (!historyIndex) return null;

  for (const candidate of groupOffers) {
    const canonicalUrl = candidate.canonicalUrl || canonicalizeOfferUrl(candidate.url);
    const cachedPublicByUrl = historyIndex.publicBlockedByUrl.get(canonicalUrl);
    if (cachedPublicByUrl) {
      return { candidate, cached: cachedPublicByUrl, kind: 'public' };
    }
    const cachedAuthwallByUrl = historyIndex.authwallBlockedByUrl.get(canonicalUrl);
    if (cachedAuthwallByUrl) {
      return { candidate, cached: cachedAuthwallByUrl, kind: 'authwall' };
    }
  }

  const cachedPublicByIdentity = historyIndex.publicBlockedByIdentity.get(identityKey);
  if (cachedPublicByIdentity) {
    return {
      candidate: groupOffers[0],
      cached: cachedPublicByIdentity,
      kind: 'public',
    };
  }

  const cachedAuthwallByIdentity = historyIndex.authwallBlockedByIdentity.get(identityKey);
  if (!cachedAuthwallByIdentity) return null;

  return {
    candidate: groupOffers[0],
    cached: cachedAuthwallByIdentity,
    kind: 'authwall',
  };
}

async function verifySearchOffers(browser, dedupedResult, existingUrlSet, existingCompanyRoleSet, historyIndex = null) {
  const offers = Array.isArray(dedupedResult?.offers) ? dedupedResult.offers : [];
  const groups = dedupedResult?.groups instanceof Map
    ? dedupedResult.groups
    : new Map(offers.map((offer) => [offer.identityKey || makeCompanyRoleKey(offer.company, offer.title, offer.roleFamilyKey), [offer]]));
  const promotionIndex = buildDirectPromotionIndex(groups);
  const needsLivenessPage = offers.some((offer) => offer.requiresLivenessCheck);
  const page = needsLivenessPage ? await browser.newPage() : null;
  const added = [];
  const reviewOffers = [];
  const history = [];
  const firstSeen = new Date().toISOString().slice(0, 10);
  const verificationStartedAt = Date.now();
  const stats = {
    liveDirectSources: 0,
    promotedDirectSources: 0,
    unverifiedPublic: 0,
    cachedPublicReview: 0,
    authwallDropped: 0,
    cachedAuthwallDropped: 0,
    reviewByQuery: new Map(),
    timings: [],
  };
  let verificationIndex = 0;

  try {
    for (const offer of offers) {
      verificationIndex += 1;
      const identityKey = offer.identityKey || makeCompanyRoleKey(offer.company, offer.title, offer.roleFamilyKey);
      const groupOffers = sortOffersForVerification(groups.get(identityKey) || [offer]);
      if (verificationIndex === 1 || verificationIndex % 10 === 0 || verificationIndex === offers.length) {
        console.log(`Progress: verification ${verificationIndex}/${offers.length} — ${offer.company} | ${offer.title}`);
      }

      const alreadySeen = groupOffers.some((candidate) => existingUrlSet.has(candidate.canonicalUrl || canonicalizeOfferUrl(candidate.url)))
        || existingCompanyRoleSet.has(identityKey);
      if (alreadySeen) {
        for (const candidate of groupOffers) {
          history.push({
            url: candidate.url,
            firstSeen,
            portal: candidate.queryName,
            title: candidate.title,
            company: candidate.company,
            status: 'skipped_dup',
          });
        }
        continue;
      }

      const promotedOffer = findDirectPromotionCandidate(groupOffers, promotionIndex, existingUrlSet);
      const verificationCandidates = promotedOffer
        ? sortOffersForVerification([promotedOffer, ...groupOffers.filter((candidate) => candidate.url !== promotedOffer.url)])
        : groupOffers;

      const blockedCache = findBlockedHistoryCache(groupOffers, identityKey, historyIndex);
      if (blockedCache && !groupHasCurrentRunDirectCandidate(verificationCandidates)) {
        const cachedOffer = blockedCache.candidate;
        if (blockedCache.kind === 'public') {
          existingUrlSet.add(cachedOffer.canonicalUrl || canonicalizeOfferUrl(cachedOffer.url));
          existingCompanyRoleSet.add(identityKey);
          const reviewReason = formatReviewReason(cachedOffer, ['public_unverified']);
          reviewOffers.push({
            ...cachedOffer,
            reviewReason,
          });
          history.push(makeOfferHistoryEntry(cachedOffer, 'review_public_unverified_cached', firstSeen, {
            bucket: 'review',
            reason: reviewReason,
          }));
          pushGroupDuplicateHistory(history, groupOffers, cachedOffer, firstSeen);
          stats.cachedPublicReview += 1;
          stats.unverifiedPublic += 1;
          stats.reviewByQuery.set(cachedOffer.queryName, (stats.reviewByQuery.get(cachedOffer.queryName) || 0) + 1);
        } else {
          history.push(makeOfferHistoryEntry(cachedOffer, 'skipped_authwall_blocked', firstSeen, {
            bucket: 'dropped',
            reason: 'authwall_blocked',
          }));
          pushGroupDuplicateHistory(history, groupOffers, cachedOffer, firstSeen);
          stats.cachedAuthwallDropped += 1;
          stats.authwallDropped += 1;
        }
        continue;
      }

      let selectedOffer = null;
      let publicRepresentative = null;
      let authwallRepresentative = null;

      for (const candidate of verificationCandidates) {
        if (!candidate.requiresLivenessCheck) {
          selectedOffer = candidate;
          break;
        }

        if (Date.now() - verificationStartedAt >= VERIFICATION_BUDGET_MS && isLowPriorityPublicOffer(candidate)) {
          publicRepresentative = publicRepresentative || {
            candidate,
            reviewReason: formatReviewReason(candidate, ['public_unverified']),
          };
          break;
        }

        const timing = resolveVerificationTiming(candidate);
        const startedAt = Date.now();
        const liveness = await checkUrl(page, candidate.url, {
          ...timing,
          expectedTitle: candidate.title,
          expectedCompany: candidate.company,
          parserKey: candidate.parserKey,
          sourceType: candidate.sourceType,
        });
        stats.timings.push({
          label: `${candidate.queryName} | ${candidate.company} | ${candidate.title}`,
          durationMs: Date.now() - startedAt,
        });

        if (liveness.result === 'expired') {
          history.push(makeOfferHistoryEntry(candidate, 'skipped_expired', firstSeen, {
            bucket: 'expired',
            reason: liveness.reason,
          }));
          continue;
        }

        if (liveness.result === 'blocked_authwall') {
          authwallRepresentative = authwallRepresentative || candidate;
          continue;
        }

        if (liveness.result === 'blocked_public') {
          publicRepresentative = publicRepresentative || {
            candidate,
            reviewReason: formatReviewReason(candidate, ['public_unverified']),
          };
          continue;
        }

        if (liveness.result === 'active_live') {
          if (isDiscoveryOnlyOffer(candidate)) {
            publicRepresentative = publicRepresentative || {
              candidate,
              reviewReason: formatReviewReason(candidate, ['public_unverified']),
            };
            continue;
          }

          selectedOffer = candidate;
          break;
        }
      }

      if (selectedOffer) {
        existingUrlSet.add(selectedOffer.canonicalUrl || canonicalizeOfferUrl(selectedOffer.url));
        existingCompanyRoleSet.add(identityKey);

        if (selectedOffer.matchBucket === 'review') {
          const reviewReason = formatReviewReason(selectedOffer);
          reviewOffers.push({
            ...selectedOffer,
            reviewReason,
          });
          history.push(makeOfferHistoryEntry(selectedOffer, 'review_review_only', firstSeen, {
            bucket: 'review',
            reason: reviewReason,
          }));
          stats.reviewByQuery.set(selectedOffer.queryName, (stats.reviewByQuery.get(selectedOffer.queryName) || 0) + 1);
        } else {
          added.push(selectedOffer);
          if (!isDiscoveryOnlyOffer(selectedOffer)) {
            stats.liveDirectSources += 1;
            if (promotedOffer && selectedOffer.url === promotedOffer.url) {
              stats.promotedDirectSources += 1;
            }
          }
        }

        pushGroupDuplicateHistory(history, groupOffers, selectedOffer, firstSeen);
        continue;
      }

      if (publicRepresentative) {
        const blockedRepresentative = publicRepresentative.candidate;
        existingUrlSet.add(blockedRepresentative.canonicalUrl || canonicalizeOfferUrl(blockedRepresentative.url));
        existingCompanyRoleSet.add(identityKey);
        reviewOffers.push({
          ...blockedRepresentative,
          reviewReason: publicRepresentative.reviewReason,
        });
        history.push(makeOfferHistoryEntry(blockedRepresentative, 'review_public_unverified', firstSeen, {
          bucket: 'review',
          reason: publicRepresentative.reviewReason,
        }));
        pushGroupDuplicateHistory(history, groupOffers, blockedRepresentative, firstSeen);
        stats.unverifiedPublic += 1;
        stats.reviewByQuery.set(blockedRepresentative.queryName, (stats.reviewByQuery.get(blockedRepresentative.queryName) || 0) + 1);
        continue;
      }

      if (authwallRepresentative) {
        history.push(makeOfferHistoryEntry(authwallRepresentative, 'skipped_authwall_blocked', firstSeen, {
          bucket: 'dropped',
          reason: 'authwall_blocked',
        }));
        pushGroupDuplicateHistory(history, groupOffers, authwallRepresentative, firstSeen);
        stats.authwallDropped += 1;
      }
    }

    return { offers: added, reviewOffers, history, stats };
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
  const titleMatcher = buildTitleMatcher(config.title_filter);
  const warnings = summarizeWarnings(config);
  const searchResultLimit = resolveSearchResultLimit(config.search_result_limit);
  const historyIndex = loadScanHistoryIndex();
  const existingUrlSet = loadSeenUrls(historyIndex);
  const existingCompanyRoleSet = loadSeenCompanyRoles(historyIndex);
  const trackedCompanies = (config.tracked_companies || [])
    .filter((company) => company.enabled !== false)
    .filter((company) => !filterCompany || company.name.toLowerCase().includes(filterCompany));
  const searchQueries = filterCompany
    ? []
    : (config.search_queries || [])
      .filter((query) => query.enabled !== false)
      .map((query) => ({ ...query, direct_search_page_limit: config.direct_search_page_limit }));

  const apiCompanies = trackedCompanies.filter((company) => detectApi(company));
  const websearchCompanies = trackedCompanies.filter((company) => !detectApi(company) && shouldUseWebsearchForCompany(company));
  const careersCompanies = trackedCompanies.filter((company) => !detectApi(company) && !shouldUseWebsearchForCompany(company) && company.careers_url);

  const browserNeeded = careersCompanies.length > 0 || websearchCompanies.length > 0 || searchQueries.length > 0;
  const browser = browserNeeded ? await chromium.launch({ headless: true }) : null;

  const runId = new Date().toISOString();
  const historyEntries = [];
  const rawOffers = [];
  const errors = [];
  const phaseTimings = [];
  const date = new Date().toISOString().slice(0, 10);

  try {
    console.log(`Progress: API companies=${apiCompanies.length}, careers pages=${careersCompanies.length}, company websearch=${websearchCompanies.length}, queries=${searchQueries.length}`);

    const apiResults = await parallelMap(apiCompanies, API_CONCURRENCY, async (company) => {
      const startedAt = Date.now();
      const result = await scanTrackedCompanyApi(company, titleMatcher);
      phaseTimings.push({ label: `api | ${company.name}`, durationMs: Date.now() - startedAt });
      return result;
    });
    for (const result of apiResults) {
      rawOffers.push(...result.offers);
      historyEntries.push(...result.history);
      errors.push(...result.errors);
    }
    if (apiCompanies.length > 0) {
      console.log(`Progress: API scan complete (${rawOffers.length} candidates so far)`);
    }

    if (browser) {
      for (const [index, company] of careersCompanies.entries()) {
        console.log(`Progress: careers page ${index + 1}/${careersCompanies.length} — ${company.name}`);
        const startedAt = Date.now();
        const result = await scanCompanyCareersPage(browser, company, titleMatcher);
        phaseTimings.push({ label: `careers | ${company.name}`, durationMs: Date.now() - startedAt });
        rawOffers.push(...result.offers);
        historyEntries.push(...result.history);
        errors.push(...result.errors);
      }
    }

    const trackedSearchResults = await parallelMap(
      websearchCompanies,
      SEARCH_CONCURRENCY,
      async (company) => {
        const startedAt = Date.now();
        const result = await scanTrackedCompanyWebsearch(company, titleMatcher, searchResultLimit);
        phaseTimings.push({ label: `company-websearch | ${company.name}`, durationMs: Date.now() - startedAt });
        return result;
      },
    );
    for (const result of trackedSearchResults) {
      rawOffers.push(...result.offers);
      historyEntries.push(...result.history);
      errors.push(...result.errors);
    }
    if (websearchCompanies.length > 0) {
      console.log(`Progress: company websearch complete (${rawOffers.length} candidates so far)`);
    }

    const queryResults = await parallelMap(searchQueries, SEARCH_CONCURRENCY, async (query) => {
      try {
        console.log(`Progress: query — ${query.name}`);
        const startedAt = Date.now();
        const result = await runSearchQuery(query, titleMatcher, searchResultLimit);
        phaseTimings.push({ label: `query | ${query.name}`, durationMs: Date.now() - startedAt });
        return result;
      } catch (error) {
        return { offers: [], history: [], error: { source: query.name, error: error.message } };
      }
    });

    for (const result of queryResults) {
      rawOffers.push(...result.offers);
      historyEntries.push(...result.history);
      if (result.error) errors.push(result.error);
    }

    const dedupedResult = dedupeOffers(rawOffers);
    const { offers: dedupedOffers } = dedupedResult;
    const firstSeen = date;
    console.log(`Progress: dedup complete (${rawOffers.length} raw -> ${dedupedOffers.length} grouped candidates)`);

    const verificationResult = browser
      ? await verifySearchOffers(browser, dedupedResult, existingUrlSet, existingCompanyRoleSet, historyIndex)
      : await verifySearchOffers(
          { newPage: async () => { throw new Error('Playwright browser required for liveness checks'); } },
          dedupedResult,
          existingUrlSet,
          existingCompanyRoleSet,
          historyIndex,
        );

    const addedOffers = verificationResult.offers;
    const reviewOffers = verificationResult.reviewOffers;
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
      appendToReviewPipeline(reviewOffers);
    }
    if (!dryRun) {
      appendHistory(historyEntries);
      writeLatestHistory(historyEntries, runId);
    }

    const expiredCount = historyEntries.filter((entry) => entry.status === 'skipped_expired').length;
    const duplicateCount = historyEntries.filter((entry) => entry.status === 'skipped_dup').length;
    const filteredCount = historyEntries.filter((entry) => entry.status === 'skipped_title').length;
    const quotaSkippedCount = historyEntries.filter((entry) => entry.status === 'skipped_source_quota').length;
    const unverifiedPublicCount = reviewOffers.filter((offer) => String(offer.reviewReason).includes('public_unverified')).length;
    const reviewOnlyCount = reviewOffers.length - unverifiedPublicCount;
    const topReviewQueries = [...verificationResult.stats.reviewByQuery.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
    const quotaByPortal = historyEntries
      .filter((entry) => entry.status === 'skipped_source_quota')
      .reduce((acc, entry) => {
        acc.set(entry.portal, (acc.get(entry.portal) || 0) + 1);
        return acc;
      }, new Map());
    const topQuotaSources = [...quotaByPortal.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3);
    const slowestOperations = [...phaseTimings, ...verificationResult.stats.timings]
      .sort((left, right) => right.durationMs - left.durationMs)
      .slice(0, 5);

    console.log(`Portal Scan — ${date}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Tracked companies scanned: ${trackedCompanies.length}`);
    console.log(`Search queries run:        ${searchQueries.length + websearchCompanies.length}`);
    console.log(`Search results/query:     ${searchResultLimit}`);
    console.log(`Candidates found:         ${rawOffers.length}`);
    console.log(`Filtered by title:        ${filteredCount}`);
    console.log(`Duplicates skipped:       ${duplicateCount}`);
    console.log(`Source quota skipped:     ${quotaSkippedCount}`);
    console.log(`Expired skipped:          ${expiredCount}`);
    console.log(`Live from direct:         ${verificationResult.stats.liveDirectSources}`);
    console.log(`Promoted to direct:       ${verificationResult.stats.promotedDirectSources}`);
    console.log(`Unverified public:        ${unverifiedPublicCount}`);
    console.log(`Review-only candidates:   ${reviewOnlyCount}`);
    console.log(`Authwall dropped:         ${verificationResult.stats.authwallDropped}`);
    console.log(`New offers added:         ${addedOffers.length}`);
    console.log(`Review candidates:        ${reviewOffers.length}`);

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

    if (reviewOffers.length > 0) {
      console.log('\nReview queue:');
      for (const offer of reviewOffers) {
        console.log(`  ~ ${offer.company} | ${offer.title} | ${offer.reviewReason}`);
      }
      if (!dryRun) {
        console.log(`\nSaved review items to ${REVIEW_PIPELINE_PATH}`);
      }
    }

    if (topReviewQueries.length > 0) {
      console.log('\nTop review queries:');
      for (const [queryName, count] of topReviewQueries) {
        console.log(`  ~ ${queryName}: ${count}`);
      }
    }

    if (topQuotaSources.length > 0) {
      console.log('\nTop quota sources:');
      for (const [portalName, count] of topQuotaSources) {
        console.log(`  ~ ${portalName}: ${count}`);
      }
    }

    if (slowestOperations.length > 0) {
      console.log('\nSlowest operations:');
      for (const item of slowestOperations) {
        console.log(`  ~ ${item.durationMs}ms | ${item.label}`);
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
