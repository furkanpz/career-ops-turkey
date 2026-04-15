#!/usr/bin/env node

/**
 * test-all.mjs — Comprehensive test suite for career-ops
 *
 * Run before merging any PR or pushing changes.
 * Tests: syntax, scripts, dashboard, data contract, personal data, paths.
 *
 * Usage:
 *   node test-all.mjs           # Run all tests
 *   node test-all.mjs --quick   # Skip dashboard build (faster)
 */

import { execSync, execFileSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const QUICK = process.argv.includes('--quick');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg) { console.log(`  ❌ ${msg}`); failed++; }
function warn(msg) { console.log(`  ⚠️  ${msg}`); warnings++; }

function run(cmd, args = [], opts = {}) {
  try {
    if (!Array.isArray(args)) {
      opts = args || {};
      args = [];
    }
    if (Array.isArray(args) && args.length > 0) {
      return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf-8', timeout: 30000, ...opts }).trim();
    }
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout: 30000, ...opts }).trim();
  } catch (e) {
    return null;
  }
}

function fileExists(path) { return existsSync(join(ROOT, path)); }
function readFile(path) { return readFileSync(join(ROOT, path), 'utf-8'); }
function readJson(path) { return JSON.parse(readFile(path)); }

function parseStatesMirror(content) {
  const entries = [];
  const blocks = content.split(/\n(?=  - id: )/).filter((block) => block.includes('- id: '));

  for (const block of blocks) {
    const id = block.match(/- id:\s+([^\n]+)/)?.[1]?.trim();
    const label = block.match(/\n\s+label:\s+([^\n]+)/)?.[1]?.trim();
    const aliasesRaw = block.match(/\n\s+aliases:\s+\[([^\]]*)\]/)?.[1] ?? '';
    const description = block.match(/\n\s+description:\s+([^\n]+)/)?.[1]?.trim();
    const dashboardGroup = block.match(/\n\s+dashboard_group:\s+([^\n]+)/)?.[1]?.trim();

    if (!id || !label || !description || !dashboardGroup) {
      return null;
    }

    const aliases = aliasesRaw
      .split(',')
      .map((alias) => alias.trim())
      .filter(Boolean);

    entries.push({ id, label, aliases, description, dashboard_group: dashboardGroup });
  }

  return entries;
}

console.log('\n🧪 career-ops test suite\n');

// ── 1. SYNTAX CHECKS ────────────────────────────────────────────

console.log('1. Syntax checks');

const mjsFiles = readdirSync(ROOT).filter(f => f.endsWith('.mjs'));
for (const f of mjsFiles) {
  const result = run('node', ['--check', f]);
  if (result !== null) {
    pass(`${f} syntax OK`);
  } else {
    fail(`${f} has syntax errors`);
  }
}

// ── 2. SCRIPT EXECUTION ─────────────────────────────────────────

console.log('\n2. Script execution (graceful on empty data)');

const scripts = [
  { name: 'cv-sync-check.mjs', expectExit: 1, allowFail: true }, // fails without cv.md (normal in repo)
  { name: 'verify-pipeline.mjs', expectExit: 0 },
  { name: 'normalize-statuses.mjs', expectExit: 0 },
  { name: 'dedup-tracker.mjs', expectExit: 0 },
  { name: 'merge-tracker.mjs', expectExit: 0 },
  { name: 'followup-cadence.mjs', expectExit: 0 },
  { name: 'update-system.mjs check', expectExit: 0 },
];

for (const { name, allowFail } of scripts) {
  const result = run(`node ${name} 2>&1`);
  if (result !== null) {
    pass(`${name} runs OK`);
  } else if (allowFail) {
    warn(`${name} exited with error (expected without user data)`);
  } else {
    fail(`${name} crashed`);
  }
}

// ── 3. DASHBOARD BUILD ──────────────────────────────────────────
console.log('\n3. Scanner contract');

let scanModule = null;
let livenessModule = null;
let trListingModule = null;
const packageJson = readJson('package.json');
const readme = readFile('README.md');
const englishReadme = fileExists('README.en.md') ? readFile('README.en.md') : readme;
const claudeDoc = readFile('CLAUDE.md');

if (fileExists('scan.mjs')) {
  pass('scan.mjs exists');
} else {
  fail('scan.mjs is missing');
}

if (packageJson.scripts?.scan === 'node scan.mjs') {
  pass('package.json exposes npm run scan');
} else {
  fail('package.json is missing the scan script');
}

if (packageJson.dependencies?.['js-yaml']) {
  pass('package.json declares js-yaml dependency');
} else {
  fail('package.json is missing js-yaml dependency');
}

if (packageJson.scripts?.followup === 'node followup-cadence.mjs --summary') {
  pass('package.json exposes npm run followup');
} else {
  fail('package.json is missing the followup script');
}

const updateSystemSource = readFile('update-system.mjs');
if (
  updateSystemSource.includes('CAREER_OPS_UPDATE_REF') &&
  updateSystemSource.includes('turkiye-core-localization')
) {
  pass('update-system.mjs uses the Turkey update channel ref');
} else {
  fail('update-system.mjs is not pinned to the Turkey update channel contract');
}

try {
  scanModule = await import(pathToFileURL(join(ROOT, 'scan.mjs')).href);
  pass('scan.mjs imports cleanly');
} catch (err) {
  fail(`scan.mjs import failed: ${err.message}`);
}

try {
  livenessModule = await import(pathToFileURL(join(ROOT, 'check-liveness.mjs')).href);
  pass('check-liveness.mjs imports cleanly');
} catch (err) {
  fail(`check-liveness.mjs import failed: ${err.message}`);
}

try {
  trListingModule = await import(pathToFileURL(join(ROOT, 'tr-listing-normalizer.mjs')).href);
  pass('tr-listing-normalizer.mjs imports cleanly');
} catch (err) {
  fail(`tr-listing-normalizer.mjs import failed: ${err.message}`);
}

if (scanModule) {
  const normalizeCases = readJson('tests/fixtures/scan/normalize-search-results.json');
  for (const testCase of normalizeCases) {
    const normalized = scanModule.normalizeSearchResult(testCase.result, testCase.query);
    if (
      normalized &&
      normalized.title === testCase.expected.title &&
      normalized.company === testCase.expected.company &&
      (testCase.expected.location === undefined || normalized.location === testCase.expected.location) &&
      normalized.source === testCase.expected.source &&
      normalized.sourceType === testCase.expected.sourceType
    ) {
      pass(`Scanner fixture OK: ${testCase.name}`);
    } else {
      fail(`Scanner fixture mismatch: ${testCase.name}`);
    }
  }

  const dedupCases = readJson('tests/fixtures/scan/dedup-precedence.json');
  for (const testCase of dedupCases) {
    const deduped = scanModule.dedupeOffers(testCase.offers).offers;
    if (
      deduped.length === 1 &&
      deduped[0].url === testCase.expected.url &&
      deduped[0].source === testCase.expected.source
    ) {
      pass(`Dedup precedence fixture OK: ${testCase.name}`);
    } else {
      fail(`Dedup precedence mismatch: ${testCase.name}`);
    }
  }

  const missingPrimary = scanModule.findMissingTrPrimarySources({
    search_queries: [{ parser_key: 'kariyernet_search' }],
  });
  if (
    missingPrimary.includes('linkedin_jobs_search') &&
    missingPrimary.includes('indeed_tr_search') &&
    missingPrimary.includes('elemannet_search')
  ) {
    pass('Missing Turkey parser key detection works');
  } else {
    fail('Missing Turkey parser key detection failed');
  }

  const companyTitleCases = readJson('tests/fixtures/scan/company-title-cleanup.json');
  for (const testCase of companyTitleCases) {
    const normalized = scanModule.normalizeCompanyListingTitle(testCase.input);
    if (normalized === testCase.expected) {
      pass(`Company title cleanup fixture OK: ${testCase.name}`);
    } else {
      fail(`Company title cleanup mismatch: ${testCase.name}`);
    }
  }

  const tolerantTitleFilter = scanModule.buildTitleFilter({
    include: {
      exact_only: ['AI', '.NET', 'QA'],
      family_contains: ['DevOps', 'AI Tutor', 'Data Management', 'ERP Sistemleri', 'Uygulama Geliştirme'],
    },
    review_only: {
      family_contains: ['Veri Bilimi Danışmanı', 'Application Support Engineer', 'Technical Consultant'],
    },
    exclude: {
      family_contains: ['Intern', 'Product Manager', 'Business Analyst', 'Scrum Master', 'Project Manager'],
    },
  });
  if (
    tolerantTitleFilter('Senior Dev Ops Engineer') &&
    tolerantTitleFilter('AI Tutor') &&
    tolerantTitleFilter('Data Management Specialist') &&
    tolerantTitleFilter('ERP Sistemleri Uygulama Geliştirme Sorumlusu') &&
    tolerantTitleFilter('QA Engineer') &&
    tolerantTitleFilter('Yazılım Geliştirme Mühendisi (.Net/Angular)') &&
    !tolerantTitleFilter('AI Tutor Intern')
  ) {
    pass('Title filter handles spacing variants and negatives');
  } else {
    fail('Title filter does not handle spacing variants correctly');
  }

  const titleMatcher = scanModule.buildTitleMatcher({
    include: {
      exact_only: ['AI', '.NET', 'QA', 'ABAP'],
      family_contains: [
        'ERP Sistemleri',
        'Uygulama Geliştirme',
        'Cloud Engineer',
        'Cloud Database Engineer',
        'Systems Engineer',
        'Test Otomasyon Mühendisi',
        'Yazılım Test',
        'Veritabanı Yönetimi',
        'Yapay Zeka Eğitmeni',
        'SAP Cloud Platform',
        'SAP HANA',
      ],
    },
    review_only: {
      exact_only: ['Danışman'],
      family_contains: ['Veri Bilimi Danışmanı', 'Technical Consultant', 'Application Support Engineer', 'ERP Applications Specialist', 'System Engineer - Application'],
    },
    exclude: {
      exact_only: ['Product Manager', 'Project Manager', 'Scrum Master'],
      family_contains: ['Business Analyst', 'Accountant'],
    },
  });

  const mainMatches = [
    'ERP Sistemleri Uygulama Geliştirme Sorumlusu',
    'Yazılım Geliştirme Mühendisi (.Net/Angular)',
    'SAP ABAP Developer',
    'SAP Cloud Platform Developer',
    'Lead SAP HANA Developer – Platform & Cloud Expertise',
    'QA Engineer',
    'Test Otomasyon Mühendisi',
    'Yazılım Test ve Devreye Alma Mühendisi',
    'Cloud Engineer',
    'Senior Cloud Database Engineer',
    'Yapay Zekâ Eğitmeni',
    'Veritabanı Yönetimi Uzmanı',
    'Systems Engineer',
  ].every((title) => titleMatcher(title).bucket === 'main');

  const reviewMatches = [
    'Veri Bilimi Danışmanı',
    'Technical Consultant',
    'Application Support Engineer',
    'ERP Applications Specialist',
    'System Engineer - Application',
  ].every((title) => titleMatcher(title).bucket === 'review');

  const rejectedMatches = [
    'Product Manager',
    'Business Analyst',
    'Scrum Master',
    'Project Manager',
  ].every((title) => titleMatcher(title).bucket === 'reject');

  const falsePositiveSafe =
    titleMatcher('ERP').bucket === 'reject' &&
    titleMatcher('Uygulama').bucket === 'reject' &&
    titleMatcher('Danışman').bucket === 'review' &&
    titleMatcher('Senior C# Accountant').bucket === 'reject';

  if (mainMatches && reviewMatches && rejectedMatches && falsePositiveSafe) {
    pass('Structured title matcher classifies main/review/reject buckets correctly');
  } else {
    fail('Structured title matcher classification failed');
  }

  const canonicalDedup = scanModule.dedupeOffers([
    {
      title: 'Yapay Zeka (AI) Geliştiricisi',
      url: 'https://www.linkedin.com/jobs/view/example-role/?trackingId=abc123',
      canonicalUrl: 'https://www.linkedin.com/jobs/view/example-role/',
      company: 'Example Corp',
      roleFamilyKey: 'yapay zeka geliştiricisi',
      source: 'LinkedIn',
      sourceType: 'job_board',
      sourcePriority: 80,
    },
    {
      title: 'Yapay Zeka (AI) Geliştiricisi',
      url: 'https://www.linkedin.com/jobs/view/example-role/?trackingId=xyz789',
      canonicalUrl: 'https://www.linkedin.com/jobs/view/example-role/',
      company: 'Example Corp',
      roleFamilyKey: 'yapay zeka geliştiricisi',
      source: 'LinkedIn',
      sourceType: 'job_board',
      sourcePriority: 80,
    },
  ]);
  if (canonicalDedup.offers.length === 1 && canonicalDedup.duplicates.length === 1) {
    pass('Dedup uses canonical URLs for tracking-parameter variants');
  } else {
    fail('Dedup did not collapse canonical URL variants');
  }

  const sampleSearchHtml = Array.from({ length: 12 }, (_, index) => (
    `<a class="result__a" href="https://example.com/${index}">Role ${index}</a>`
  )).join('');
  const limitedSearchResults = scanModule.parseSearchResultsHtml(sampleSearchHtml, 10);
  if (limitedSearchResults.length === 10) {
    pass('Search result limit override works');
  } else {
    fail('Search result limit override failed');
  }

  const sampleBingRss = [
    '<?xml version="1.0"?>',
    '<rss><channel>',
    '<item><title>Software Engineer - Example Corp</title><link>https://example.com/jobs/1</link></item>',
    '<item><title>Backend Engineer - Sample Inc</title><link>https://example.com/jobs/2</link></item>',
    '</channel></rss>',
  ].join('');
  const bingResults = scanModule.parseBingRssResultsXml(sampleBingRss, 10);
  if (bingResults.length === 2 && bingResults[0].url === 'https://example.com/jobs/1') {
    pass('Bing RSS parser works');
  } else {
    fail('Bing RSS parser failed');
  }

  const sampleLinkedInHtml = [
    '<ul class="jobs-search__results-list"><li>',
    '<div class="base-card">',
    '<a class="base-card__full-link" href="https://tr.linkedin.com/jobs/view/example-1"></a>',
    '<div class="base-search-card__info">',
    '<h3 class="base-search-card__title">Junior Software Engineer</h3>',
    '<h4 class="base-search-card__subtitle"><a>Example Corp</a></h4>',
    '<div class="base-search-card__metadata"><span class="job-search-card__location">Türkiye</span></div>',
    '</div></div></li></ul>',
  ].join('');
  const linkedInResults = scanModule.parseLinkedInSearchResultsHtml(sampleLinkedInHtml, 10);
  if (
    linkedInResults.length === 1 &&
    linkedInResults[0].title === 'Junior Software Engineer' &&
    linkedInResults[0].company === 'Example Corp'
  ) {
    pass('LinkedIn direct search parser works');
  } else {
    fail('LinkedIn direct search parser failed');
  }

  const sampleKariyerHtml = [
    '<div data-test="ad-card">',
    '<a href="/is-ilani/example-company-yazilim-muhendisi-123" class="k-ad-card">',
    '<span data-test="ad-card-title">Yazılım Mühendisi</span>',
    '<span data-test="subtitle">Example Company</span>',
    '<span data-test="location">İstanbul</span>',
    '</a>',
    '</div>',
  ].join('');
  const kariyerResults = scanModule.parseKariyerSearchResultsHtml(sampleKariyerHtml, 10);
  if (
    kariyerResults.length === 1 &&
    kariyerResults[0].title === 'Yazılım Mühendisi' &&
    kariyerResults[0].company === 'Example Company'
  ) {
    pass('Kariyer direct search parser works');
  } else {
    fail('Kariyer direct search parser failed');
  }

  const genericTrBoardFixtures = [
    {
      name: 'Indeed TR',
      parser: scanModule.parseIndeedTrSearchResultsHtml,
      url: 'https://tr.indeed.com/viewjob?jk=abc123',
    },
    {
      name: 'Eleman.net',
      parser: scanModule.parseElemanNetSearchResultsHtml,
      url: 'https://www.eleman.net/is-ilani/backend-developer-i123',
    },
    {
      name: 'Secretcv',
      parser: scanModule.parseSecretcvSearchResultsHtml,
      url: 'https://www.secretcv.com/is-ilanlari/backend-developer-is-ilani-123',
    },
    {
      name: 'Yenibiris',
      parser: scanModule.parseYenibirisSearchResultsHtml,
      url: 'https://www.yenibiris.com/is-ilanlari/backend-developer/123',
    },
    {
      name: 'ISKUR',
      parser: scanModule.parseIskurSearchResultsHtml,
      url: 'https://esube.iskur.gov.tr/Istihdam/AcikIsIlanDetay.aspx?uiID=123',
    },
  ];
  for (const fixture of genericTrBoardFixtures) {
    const html = [
      '<article class="job-card">',
      `<a class="job-title" href="${fixture.url}">Backend Developer</a>`,
      '<span class="company">Example Teknoloji</span>',
      '<span class="location">Istanbul Hybrid</span>',
      '</article>',
    ].join('');
    const parsed = fixture.parser(html, 10);
    if (
      parsed.length === 1 &&
      parsed[0].title === 'Backend Developer' &&
      parsed[0].company === 'Example Teknoloji' &&
      parsed[0].location === 'Istanbul Hybrid'
    ) {
      pass(`${fixture.name} direct search parser works`);
    } else {
      fail(`${fixture.name} direct search parser failed`);
    }
  }

  const elemanCardHtml = [
    '<div class="c-box__body ilan_listeleme_bol">',
    '<a href="https://www.eleman.net/is-ilani/net-backend-developer-i4612914" title="Net Backend Developer iş ilanı" target="_blank">',
    '<h3 class="c-showcase-box__title u-gap-bottom-xsmall">Net Backend Developer</h3>',
    '<span class="c-showcase-box__subtitle">Foxsoft Bilişim - <i class="icon icon-map-marker"></i> İstanbul Anadolu - Kartal</span>',
    '</a>',
    '</div>',
  ].join('');
  const elemanCardResults = scanModule.parseElemanNetSearchResultsHtml(elemanCardHtml, 10);
  if (
    elemanCardResults.length === 1 &&
    elemanCardResults[0].title === 'Net Backend Developer' &&
    elemanCardResults[0].company === 'Foxsoft Bilişim' &&
    elemanCardResults[0].location === 'İstanbul Anadolu - Kartal'
  ) {
    pass('Eleman card parser works');
  } else {
    fail('Eleman card parser failed');
  }

  const kariyerFallbackHtml = [
    '<article class="job-card">',
    '<a href="https://www.kariyer.net/is-ilani/example-company-backend-developer-123">Backend Developer</a>',
    '<span class="company">Example Company</span>',
    '<span class="location">İstanbul</span>',
    '</article>',
  ].join('');
  const kariyerFallbackResults = scanModule.parseKariyerSearchResultsHtml(kariyerFallbackHtml, 10);
  if (
    kariyerFallbackResults.length === 1 &&
    kariyerFallbackResults[0].title === 'Backend Developer' &&
    kariyerFallbackResults[0].company === 'Example Company'
  ) {
    pass('Kariyer fallback parser works');
  } else {
    fail('Kariyer fallback parser failed');
  }

  const kariyerBlockedHtml = [
    '<html>',
    '<head><meta name="description" content="px-captcha"><title>Access to this page has been denied</title></head>',
    '<body>Press & Hold to confirm you are a human</body>',
    '</html>',
  ].join('');
  if (
    scanModule.isBlockedSearchHtml(kariyerBlockedHtml) &&
    scanModule.blockedFetchReason(new Error('HTTP 403')) === 'captcha_blocked' &&
    scanModule.blockedFetchReason(new Error('HTTP 429')) === 'rate_limited' &&
    scanModule.parseKariyerSearchResultsHtml(kariyerBlockedHtml, 10).length === 0
  ) {
    pass('Blocked search HTML detector works');
  } else {
    fail('Blocked search HTML detector failed');
  }

  const linkedInPages = scanModule.expandDirectSearchUrls({
    pagination: { type: 'linkedin_start', page_size: 25, max_pages: 3 },
    search_urls: ['https://www.linkedin.com/jobs/search/?keywords=Software%20Engineer&location=Turkey'],
  }, 3);
  if (
    linkedInPages.length === 3 &&
    linkedInPages[1].includes('start=25') &&
    linkedInPages[2].includes('start=50')
  ) {
    pass('LinkedIn direct pagination expansion works');
  } else {
    fail('LinkedIn direct pagination expansion failed');
  }

  const kariyerPages = scanModule.expandDirectSearchUrls({
    pagination: { type: 'kariyer_path', max_pages: 3 },
    search_urls: ['https://www.kariyer.net/is-ilanlari/yazilim%2Bmuhendisi'],
  }, 3);
  if (
    kariyerPages.length === 3 &&
    kariyerPages[1].endsWith('/is-ilanlari/yazilim%2Bmuhendisi-2') &&
    kariyerPages[2].endsWith('/is-ilanlari/yazilim%2Bmuhendisi-3')
  ) {
    pass('Kariyer direct pagination expansion works');
  } else {
    fail('Kariyer direct pagination expansion failed');
  }

  const kariyerQuerySeedPages = scanModule.expandDirectSearchUrls({
    search_urls: ['https://www.kariyer.net/is-ilanlari?kw=yaz%C4%B1l%C4%B1m'],
  }, 3);
  if (
    kariyerQuerySeedPages.length === 3 &&
    kariyerQuerySeedPages[0] === 'https://www.kariyer.net/is-ilanlari?kw=yaz%C4%B1l%C4%B1m' &&
    kariyerQuerySeedPages[1] === 'https://www.kariyer.net/is-ilanlari?kw=yaz%C4%B1l%C4%B1m&cp=2' &&
    kariyerQuerySeedPages[2] === 'https://www.kariyer.net/is-ilanlari?kw=yaz%C4%B1l%C4%B1m&cp=3'
  ) {
    pass('Kariyer query pagination expansion works');
  } else {
    fail('Kariyer query pagination expansion failed');
  }

  const elemanPages = scanModule.expandDirectSearchUrls({
    parser_key: 'elemannet_search',
    search_urls: ['https://www.eleman.net/is-ilanlari?aranan=yaz%C4%B1l%C4%B1m&arandi=e&sehir=&ilce='],
  }, 3);
  if (
    elemanPages.length === 3 &&
    elemanPages[0] === 'https://www.eleman.net/is-ilanlari?aranan=yaz%C4%B1l%C4%B1m&arandi=e&sehir=&ilce=' &&
    elemanPages[1] === 'https://www.eleman.net/is-ilanlari?aranan=yaz%C4%B1l%C4%B1m&arandi=e&sehir=&ilce=&sy=2' &&
    elemanPages[2] === 'https://www.eleman.net/is-ilanlari?aranan=yaz%C4%B1l%C4%B1m&arandi=e&sehir=&ilce=&sy=3'
  ) {
    pass('Eleman direct search pagination expansion works');
  } else {
    fail('Eleman direct search pagination expansion failed');
  }

  const linkedInQuotaHistory = [];
  const linkedInQuotaOffers = Array.from({ length: 35 }, (_, index) => ({
    url: `https://www.linkedin.com/jobs/view/${index + 1}`,
    queryName: 'LinkedIn Jobs — Turkey Software, Backend, Junior & AI',
    title: `Backend Engineer ${index + 1}`,
    company: `Example ${index + 1}`,
    parserKey: 'linkedin_jobs_search',
    roleFamilyKey: `role-family-${index + 1}`,
  }));
  const linkedInQuotaKept = scanModule.applySourceQuotas(linkedInQuotaOffers, linkedInQuotaHistory, '2026-04-15');
  const linkedInTotalQuotaDrops = linkedInQuotaHistory.filter((entry) => entry.reason === 'linkedin_total_quota').length;
  if (
    linkedInQuotaKept.length === 30 &&
    linkedInTotalQuotaDrops === 5
  ) {
    pass('LinkedIn total quota works');
  } else {
    fail('LinkedIn total quota failed');
  }

  const elemanRealisticCard = scanModule.normalizeSearchResult({
    title: 'Net Backend Developer Foxsoft Bilişim - İstanbul Anadolu - Kartal Foxsof Bilişim olarak büyüyen ekibimize katılacak',
    url: 'https://www.eleman.net/is-ilani/net-backend-developer-i4612914',
  }, {
    name: 'Eleman.net — Software, Developer, Data & AI',
    parser_key: 'elemannet_search',
    adapter_family: 'turkish_job_board',
  });
  if (
    elemanRealisticCard &&
    elemanRealisticCard.title === 'Net Backend Developer' &&
    elemanRealisticCard.company === 'Foxsoft Bilişim' &&
    elemanRealisticCard.location === 'İstanbul Anadolu'
  ) {
    pass('Eleman realistic card title normalization works');
  } else {
    fail('Eleman realistic card title normalization failed');
  }

  const reviewMergeCases = readJson('tests/fixtures/scan/review-merge.json');
  for (const testCase of reviewMergeCases) {
    const merged = scanModule.mergeReviewQueueEntries(testCase.existing, testCase.incoming);
    const simplify = (items) => items.map((item) => ({
      url: item.url,
      company: item.company,
      title: item.title,
      reviewReason: item.reviewReason,
    }));
    if (
      JSON.stringify(simplify(merged.unverified_public || [])) === JSON.stringify(testCase.expected.unverified_public) &&
      JSON.stringify(simplify(merged.review_only || [])) === JSON.stringify(testCase.expected.review_only)
    ) {
      pass(`Review queue merge fixture OK: ${testCase.name}`);
    } else {
      fail(`Review queue merge mismatch: ${testCase.name}`);
    }
  }

  const latestHistoryCases = readJson('tests/fixtures/scan/latest-history.json');
  for (const testCase of latestHistoryCases) {
    const lines = scanModule.buildLatestHistoryTsv(testCase.entries, testCase.runId).trim().split('\n');
    if (
      lines[0] === testCase.expectedHeader &&
      JSON.stringify(lines.slice(1)) === JSON.stringify(testCase.expectedRows)
    ) {
      pass(`Latest history fixture OK: ${testCase.name}`);
    } else {
      fail(`Latest history fixture mismatch: ${testCase.name}`);
    }
  }

  const normalizedLegacyReason = scanModule.normalizeLegacyReviewEntryReason('review_only:Veri Bilimi Danışmanı; blocked_source_cached');
  if (normalizedLegacyReason === 'review_only:Veri Bilimi Danışmanı; authwall_blocked') {
    pass('Legacy review reason normalization works');
  } else {
    fail('Legacy review reason normalization failed');
  }

  if (
    scanModule.shouldKeepVisibleReviewReason('authwall_blocked') &&
    scanModule.shouldKeepVisibleReviewReason('public_unverified') &&
    scanModule.shouldKeepVisibleReviewReason('review_only:Application Support Engineer')
  ) {
    pass('Visible review reason filter works');
  } else {
    fail('Visible review reason filter failed');
  }

  const authwallReviewLatestHistory = scanModule.buildLatestHistoryTsv([
    {
      url: 'https://www.kariyer.net/is-ilani/example-backend',
      firstSeen: '2026-04-12',
      portal: 'Kariyer.net — Software, Developer & Junior',
      title: 'Backend Developer',
      company: 'Example Corp',
      status: 'review_blocked_source',
      reason: 'authwall_blocked',
    },
  ], '2026-04-12T10:30:00.000Z').trim().split('\n')[1];
  if (
    authwallReviewLatestHistory === '2026-04-12T10:30:00.000Z\thttps://www.kariyer.net/is-ilani/example-backend\t2026-04-12\tKariyer.net — Software, Developer & Junior\tBackend Developer\tExample Corp\treview_blocked_source\treview\tauthwall_blocked\tkariyer.net'
  ) {
    pass('Authwall review latest-history reason works');
  } else {
    fail('Authwall review latest-history reason failed');
  }

  const sourceBlockedLatestHistory = scanModule.buildLatestHistoryTsv([
    {
      url: 'https://www.kariyer.net/is-ilanlari?kw=yaz%C4%B1l%C4%B1m',
      firstSeen: '2026-04-15',
      portal: 'Kariyer.net — Software, Developer & Junior',
      title: 'Kariyer.net search blocked',
      company: 'Kariyer.net',
      status: 'skipped_blocked_source',
      bucket: 'dropped',
      reason: 'captcha_blocked',
    },
  ], '2026-04-15T10:30:00.000Z').trim().split('\n')[1];
  if (
    sourceBlockedLatestHistory === '2026-04-15T10:30:00.000Z\thttps://www.kariyer.net/is-ilanlari?kw=yaz%C4%B1l%C4%B1m\t2026-04-15\tKariyer.net — Software, Developer & Junior\tKariyer.net search blocked\tKariyer.net\tskipped_blocked_source\tdropped\tcaptcha_blocked\tkariyer.net'
  ) {
    pass('Source blocked latest-history diagnostic works');
  } else {
    fail('Source blocked latest-history diagnostic failed');
  }

  if (
    scanModule.isLikelyCareersNoiseEntry({ title: 'Privacy policy', href: 'https://example.com/privacy-policy', context: '' }) &&
    scanModule.isLikelyCareersNoiseEntry({ title: 'Join Us!', href: 'https://example.com/careers', context: 'Careers page' }) &&
    !scanModule.isLikelyCareersNoiseEntry({ title: 'Senior Backend Engineer', href: 'https://example.com/careers/jobs/senior-backend-engineer', context: 'Engineering Team Backend Platform' })
  ) {
    pass('Careers noise filter works');
  } else {
    fail('Careers noise filter failed');
  }

  const promotionIndex = new Map([
    ['papara', [
      {
        title: 'Senior Backend Developer',
        company: 'Papara',
        url: 'https://careers.papara.com/jobs/senior-backend-developer',
        canonicalUrl: 'https://careers.papara.com/jobs/senior-backend-developer',
        sourceType: 'company_careers',
        sourcePriority: 100,
        parserKey: 'custom_careers_hub',
        roleFamilyKey: 'backend',
        identityKey: 'papara::senior::backend',
      },
    ]],
  ]);
  const promoted = scanModule.findDirectPromotionCandidate([
    {
      title: 'Senior Backend Engineer',
      company: 'Papara',
      url: 'https://tr.linkedin.com/jobs/view/example',
      canonicalUrl: 'https://tr.linkedin.com/jobs/view/example',
      parserKey: 'linkedin_jobs_search',
      sourceType: 'job_board',
      sourcePriority: 80,
      roleFamilyKey: 'backend engineer',
      identityKey: 'papara::senior::backend engineer',
    },
  ], promotionIndex, new Set());
  if (promoted?.url === 'https://careers.papara.com/jobs/senior-backend-developer') {
    pass('Direct-source promotion match works');
  } else {
    fail('Direct-source promotion match failed');
  }
}

if (livenessModule) {
  const signalCases = readJson('tests/fixtures/scan/liveness-signals.json');
  for (const testCase of signalCases) {
    const result = livenessModule.classifyLivenessSignals(testCase.input);
    if (result.result === testCase.expected) {
      pass(`Liveness fixture OK: ${testCase.name}`);
    } else {
      fail(`Liveness fixture mismatch: ${testCase.name}`);
    }
  }
}

if (trListingModule) {
  const normalized = trListingModule.normalizeTrListingCandidate({
    title: 'Senior Backend Engineer - Istanbul Hybrid - English',
    company: 'Example A.S.',
    url: 'https://www.kariyer.net/is-ilani/example?utm_source=test',
    source: 'Kariyer.net',
    sourceType: 'job_board',
    parserKey: 'kariyernet_search',
    location: 'Istanbul',
    compensationText: '120.000 TL gross',
    discoveryMethod: 'direct_board_search',
  }, { updatedAt: '2026-04-14T00:00:00.000Z' });
  if (
    normalized.city === 'istanbul' &&
    normalized.work_model === 'hybrid' &&
    normalized.language === 'en' &&
    normalized.seniority === 'senior' &&
    normalized.salary_transparency === 'transparent' &&
    normalized.source_slug === 'kariyer_net' &&
    normalized.confidence_score >= 0.8
  ) {
    pass('TR listing normalizer extracts core metadata');
  } else {
    fail(`TR listing normalizer mismatch: ${JSON.stringify(normalized)}`);
  }

  const tags = trListingModule.makeTrListingTags(normalized);
  if (
    tags.includes('city:istanbul') &&
    tags.includes('work_model:hybrid') &&
    tags.includes('lang:en') &&
    tags.includes('salary:transparent') &&
    tags.includes('source:kariyer_net')
  ) {
    pass('TR listing metadata tags are stable');
  } else {
    fail(`TR listing metadata tags mismatch: ${tags.join(' ')}`);
  }

  const canonicalInput = trListingModule.normalizeTrListingCandidate({
    title: 'QA Engineer',
    company: 'Canonical Corp',
    url: 'https://example.com/canonical-job',
    source: 'Company Careers',
    sourceType: 'company_careers',
    workModel: 'on_site',
    language: 'tr_en',
    employmentType: 'full_time',
    salaryTransparency: 'transparent',
  }, { updatedAt: '2026-04-14T00:00:00.000Z' });
  if (
    canonicalInput.work_model === 'on_site' &&
    canonicalInput.language === 'tr_en' &&
    canonicalInput.employment_type === 'full_time' &&
    canonicalInput.salary_transparency === 'transparent'
  ) {
    pass('TR listing normalizer preserves canonical metadata values');
  } else {
    fail(`TR listing normalizer dropped canonical values: ${JSON.stringify(canonicalInput)}`);
  }

  const extendedEnums = trListingModule.normalizeTrListingCandidate({
    title: 'Field Engineering Director',
    company: 'Expanded Corp',
    url: 'https://example.com/expanded-job',
    source: 'Company Careers',
    sourceType: 'company_careers',
    location: 'Sahada',
    language: 'German',
    employmentType: 'temporary',
  }, { updatedAt: '2026-04-14T00:00:00.000Z' });
  if (
    extendedEnums.work_model === 'field' &&
    extendedEnums.seniority === 'director' &&
    extendedEnums.language === 'de' &&
    extendedEnums.employment_type === 'temporary'
  ) {
    pass('TR listing normalizer covers extended enum values');
  } else {
    fail(`TR listing normalizer extended enum mismatch: ${JSON.stringify(extendedEnums)}`);
  }

  const sidecar = trListingModule.buildTrListingSidecarJsonl(
    '{"canonical_url":"https://example.com/job","url":"https://example.com/job","city":"ankara"}\n',
    [{
      title: 'Backend Developer',
      company: 'Example',
      url: 'https://example.com/job?utm_source=x',
      source: 'Company Careers',
      sourceType: 'company_careers',
      location: 'Istanbul Remote',
    }],
    { updatedAt: '2026-04-14T00:00:00.000Z' },
  );
  const sidecarRows = sidecar.trim().split('\n').map((line) => JSON.parse(line));
  if (sidecarRows.length === 1 && sidecarRows[0].city === 'istanbul' && sidecarRows[0].work_model === 'remote') {
    pass('TR listing sidecar upsert is keyed by canonical URL');
  } else {
    fail(`TR listing sidecar upsert mismatch: ${sidecar}`);
  }
}

// ── 4. DASHBOARD BUILD ──────────────────────────────────────────

if (!QUICK) {
  console.log('\n4. Dashboard build');
  const goBuild = run('cd dashboard && env GOCACHE=/tmp/career-ops-go-build-cache go build -o /tmp/career-dashboard-test . 2>&1');
  if (goBuild !== null) {
    pass('Dashboard compiles');
  } else {
    fail('Dashboard build failed');
  }
} else {
  console.log('\n4. Dashboard build (skipped --quick)');
}

// ── 5. DATA CONTRACT ────────────────────────────────────────────

console.log('\n5. Data contract validation');

// Check system files exist
const systemFiles = [
  'AGENTS.md', 'CLAUDE.md', 'VERSION', 'DATA_CONTRACT.md', 'docs/CODEX.md',
  'modes/_shared.md', 'modes/_profile.template.md',
  'modes/oferta.md', 'modes/pdf.md', 'modes/scan.md', 'scan.mjs',
  'modes/followup.md', 'followup-cadence.mjs',
  'modes/tr/_shared.md', 'modes/tr/teklif.md', 'modes/tr/basvur.md',
  'modes/tr/followup.md',
  'templates/states.yml', 'templates/cv-template.html', 'templates/portals.tr.example.yml',
  'config/profile.tr.example.yml', 'tracker-status-registry.json',
  'tracker-status-utils.mjs', 'cv-template-utils.mjs', 'company-name-utils.mjs',
  'tr-listing-normalizer.mjs',
  '.claude/skills/career-ops/SKILL.md', '.opencode/commands/career-ops.md',
  '.opencode/commands/career-ops-patterns.md', '.opencode/commands/career-ops-followup.md',
];

for (const f of systemFiles) {
  if (fileExists(f)) {
    pass(`System file exists: ${f}`);
  } else {
    fail(`Missing system file: ${f}`);
  }
}

// Check user files are NOT tracked (gitignored)
const userFiles = [
  'config/profile.yml', 'modes/_profile.md', 'portals.yml',
];
for (const f of userFiles) {
  const tracked = run(`git ls-files ${f} 2>/dev/null`);
  if (tracked === '') {
    pass(`User file gitignored: ${f}`);
  } else if (tracked === null) {
    pass(`User file gitignored: ${f}`);
  } else {
    fail(`User file IS tracked (should be gitignored): ${f}`);
  }
}

const registryRaw = readFile('tracker-status-registry.json');
const registry = JSON.parse(registryRaw);
const statesMirror = parseStatesMirror(readFile('templates/states.yml'));

if (!statesMirror) {
  fail('templates/states.yml could not be parsed as a registry mirror');
} else if (statesMirror.length !== registry.tracker_statuses.length) {
  fail('templates/states.yml does not match tracker-status-registry.json entry count');
} else {
  let mirrorMismatch = false;
  const byId = new Map(statesMirror.map((entry) => [entry.id, entry]));

  for (const status of registry.tracker_statuses) {
    const mirrorEntry = byId.get(status.group);
    if (!mirrorEntry) {
      fail(`templates/states.yml missing mirror entry for ${status.group}`);
      mirrorMismatch = true;
      continue;
    }

    const expectedAliases = status.aliases.join('||');
    const actualAliases = mirrorEntry.aliases.join('||');

    if (
      mirrorEntry.label !== status.label ||
      mirrorEntry.dashboard_group !== status.group ||
      mirrorEntry.description !== status.description ||
      actualAliases !== expectedAliases
    ) {
      fail(`templates/states.yml drift detected for ${status.group}`);
      mirrorMismatch = true;
    }
  }

if (!mirrorMismatch) {
  pass('templates/states.yml mirrors tracker-status-registry.json');
  }
}

const trProfileTemplate = readFile('config/profile.tr.example.yml');
if (
  !trProfileTemplate.includes('Ayse Yilmaz') &&
  !trProfileTemplate.includes('Senior Backend Engineer') &&
  !trProfileTemplate.includes('Staff Platform Engineer') &&
  trProfileTemplate.includes('Deniz Kaya') &&
  trProfileTemplate.includes('Software / Backend Engineer') &&
  trProfileTemplate.includes('Product / Program Manager')
) {
  pass('TR profile starter is persona-neutral');
} else {
  fail('TR profile starter still looks tied to a specific default candidate');
}

const trPortalTemplate = readFile('templates/portals.tr.example.yml');
if (
  trPortalTemplate.includes('Software Engineer') &&
  trPortalTemplate.includes('Product Manager') &&
  trPortalTemplate.includes('QA') &&
  trPortalTemplate.includes('UX Designer') &&
  trPortalTemplate.includes('Data Engineer')
) {
  pass('TR portal starter covers multiple tech role families');
} else {
  fail('TR portal starter still looks too role-biased');
}

const trCompletionDocs =
  readFile('DATA_CONTRACT.md') +
  readFile('docs/tr-profile-schema.md') +
  readFile('docs/tr-data-model.md') +
  readFile('docs/tr-validation-plan.md') +
  readFile('docs/tr-task-breakdown.md') +
  readFile('docs/tr-review-findings.md') +
  readFile('docs/tr-portal-config.md');
if (
  trCompletionDocs.includes('Turkey locale profile starter') &&
  trCompletionDocs.includes('Historical planning note') &&
  trCompletionDocs.includes('Historical review snapshot') &&
  !trCompletionDocs.includes('Turkey-first') &&
  !trCompletionDocs.includes('Ayse Yilmaz') &&
  !trCompletionDocs.includes('Senior Backend Engineer')
) {
  pass('TR docs are aligned with the generic locale contract');
} else {
  fail('TR docs still contain stale persona markers or outdated locale wording');
}

const trHistoricalDocs =
  readFile('docs/tr-localization-map.md') +
  readFile('docs/tr-dashboard-plan.md') +
  readFile('docs/tr-cv-output-strategy.md') +
  readFile('docs/tr-parser-implementation-plan.md') +
  readFile('docs/tr-pdf-validation-checklist.md') +
  readFile('docs/tr-status-map.md');
if (
  trHistoricalDocs.includes('Historical analysis note') &&
  trHistoricalDocs.includes('Historical planning note') &&
  trHistoricalDocs.includes('Supporting design note') &&
  trHistoricalDocs.includes('Supporting validation note') &&
  trHistoricalDocs.includes('Historical design note')
) {
  pass('Historical TR planning docs are clearly scoped as non-contract references');
} else {
  fail('Historical TR planning docs still read like active product contracts');
}

const trActiveContractDocs =
  readFile('docs/tr-data-model.md') +
  readFile('docs/tr-evaluation-output-spec.md') +
  readFile('docs/tr-normalization-spec.md') +
  readFile('docs/tr-portal-config.md') +
  readFile('docs/tr-profile-schema.md') +
  readFile('docs/tr-scoring-framework.md') +
  readFile('docs/tr-source-adapter-contract.md') +
  readFile('docs/tr-validation-plan.md');
if (
  !trActiveContractDocs.includes('update-system.mjs still points to `santifer/career-ops`') &&
  !trActiveContractDocs.includes('Verification still checks Spanish-centric canonical statuses') &&
  !trActiveContractDocs.includes('Dashboard report parsing is label-coupled') &&
  !trActiveContractDocs.includes('MVP-required')
) {
  pass('Active TR contract docs no longer contain stale pre-fix claims');
} else {
  fail('Active TR contract docs still contain stale pre-fix or planning-only claims');
}

const localizedSharedModes =
  readFile('modes/de/_shared.md') +
  readFile('modes/fr/_shared.md') +
  readFile('modes/pt/_shared.md');
if (
  localizedSharedModes.includes('modes/_profile.md') &&
  localizedSharedModes.includes('Software / Backend / Platform') &&
  !localizedSharedModes.includes('ANPASSEN DIESER DATEI') &&
  !localizedSharedModes.includes('PERSONNALISATION DE CE FICHIER') &&
  !localizedSharedModes.includes('AI Platform / LLMOps Engineer')
) {
  pass('Localized shared modes follow the generic system-layer contract');
} else {
  fail('Localized shared modes still imply persona-biased or user-editable system defaults');
}

if (
  englishReadme.includes('locale adaptation') &&
  englishReadme.includes('user-layer `portals.yml`') &&
  englishReadme.includes('Parity scope in this fork tracks the upstream `v1.4` product surface') &&
  claudeDoc.includes('locale-aware only; it must still be customized') &&
  claudeDoc.includes('role targeting still belongs')
) {
  pass('README and CLAUDE preserve the user-layer customization rule');
} else {
  fail('README and CLAUDE drift from the generic customization model');
}

if (
  readme.includes('/career-ops followup') &&
  claudeDoc.includes('/career-ops-followup') &&
  fileExists('modes/followup.md') &&
  fileExists('modes/tr/followup.md')
) {
  pass('Followup surface is wired across docs and mode files');
} else {
  fail('Followup parity is incomplete');
}

// ── 6. PERSONAL DATA LEAK CHECK ─────────────────────────────────

console.log('\n6. Personal data leak check');

const leakPatterns = [
  'Santiago', 'santifer.io', 'Santifer iRepair', 'Zinkee', 'ALMAS',
  'hi@santifer.io', '688921377', '/Users/santifer/',
];

const scanExtensions = ['md', 'yml', 'html', 'mjs', 'sh', 'go', 'json'];
const allowedFiles = [
  'README.md', 'README.en.md', 'README.tr.md', 'README.es.md', 'README.ja.md', 'README.ko-KR.md',
  'README.pt-BR.md', 'README.ru.md', 'README.zh-TW.md',
  'LICENSE', 'CITATION.cff', 'CONTRIBUTING.md',
  'package.json', '.github/FUNDING.yml', 'CLAUDE.md', 'go.mod', 'test-all.mjs',
  'CODE_OF_CONDUCT.md', 'GOVERNANCE.md', 'SECURITY.md', 'SUPPORT.md', '.github/SECURITY.md',
  'CHANGELOG.md', '.github/ISSUE_TEMPLATE/i-got-hired.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  'dashboard/internal/ui/screens/pipeline.go',
  'dashboard/internal/ui/screens/progress.go',
];
const grepPathspec = scanExtensions.map((ext) => `'*.${ext}'`).join(' ');

let leakFound = false;
for (const pattern of leakPatterns) {
  const result = run(
    `git grep -n "${pattern}" -- ${grepPathspec} 2>/dev/null`
  );
  if (result) {
    for (const line of result.split('\n')) {
      const file = line.split(':')[0];
      if (allowedFiles.some(a => file.includes(a))) continue;
      if (file.includes('dashboard/go.mod')) continue;
      warn(`Possible personal data in ${file}: "${pattern}"`);
      leakFound = true;
    }
  }
}
if (!leakFound) {
  pass('No personal data leaks outside allowed files');
}

// ── 6. ABSOLUTE PATH CHECK ──────────────────────────────────────

console.log('\n6. Absolute path check');

const absPathResult = run(
  `git grep -n "/Users/" -- '*.mjs' '*.sh' '*.md' '*.go' '*.yml' 2>/dev/null | grep -v README.md | grep -v LICENSE | grep -v CLAUDE.md | grep -v test-all.mjs`
);
if (!absPathResult) {
  pass('No absolute paths in code files');
} else {
  for (const line of absPathResult.split('\n').filter(Boolean)) {
    fail(`Absolute path: ${line.slice(0, 100)}`);
  }
}

// ── 7. MODE FILE INTEGRITY ──────────────────────────────────────

console.log('\n7. Mode file integrity');

const expectedModes = [
  '_shared.md', '_profile.template.md', 'oferta.md', 'pdf.md', 'scan.md',
  'batch.md', 'apply.md', 'auto-pipeline.md', 'contacto.md', 'deep.md',
  'ofertas.md', 'pipeline.md', 'project.md', 'tracker.md', 'training.md',
  'patterns.md', 'interview-prep.md', 'followup.md',
];
const expectedTurkishModes = [
  '_shared.md', 'README.md', 'teklif.md', 'basvur.md', 'pipeline.md',
  'auto-pipeline.md', 'pdf.md', 'scan.md', 'batch.md', 'tracker.md',
  'contacto.md', 'ofertas.md', 'deep.md', 'project.md', 'training.md',
  'patterns.md', 'interview-prep.md', 'followup.md',
];

for (const mode of expectedModes) {
  if (fileExists(`modes/${mode}`)) {
    pass(`Mode exists: ${mode}`);
  } else {
    fail(`Missing mode: ${mode}`);
  }
}

for (const mode of expectedTurkishModes) {
  if (fileExists(`modes/tr/${mode}`)) {
    pass(`Turkish mode exists: ${mode}`);
  } else {
    fail(`Missing Turkish mode: ${mode}`);
  }
}

// Check _shared.md references _profile.md
const shared = readFile('modes/_shared.md');
if (shared.includes('_profile.md')) {
  pass('_shared.md references _profile.md');
} else {
  fail('_shared.md does NOT reference _profile.md');
}

// ── 8. CLAUDE.md INTEGRITY ──────────────────────────────────────

console.log('\n8. CLAUDE.md integrity');

const claude = readFile('CLAUDE.md');
const requiredSections = [
  'Data Contract', 'Update Check', 'Ethical Use',
  'Offer Verification', 'Canonical States', 'TSV Format',
  'First Run', 'Onboarding',
];

for (const section of requiredSections) {
  if (claude.includes(section)) {
    pass(`CLAUDE.md has section: ${section}`);
  } else {
    fail(`CLAUDE.md missing section: ${section}`);
  }
}

// ── 9. VERSION FILE ─────────────────────────────────────────────

console.log('\n9. Version file');

if (fileExists('VERSION')) {
  const version = readFile('VERSION').trim();
  if (/^\d+\.\d+\.\d+$/.test(version)) {
    pass(`VERSION is valid semver: ${version}`);
  } else {
    fail(`VERSION is not valid semver: "${version}"`);
  }

  if (fileExists('package.json')) {
    const packageVersion = JSON.parse(readFile('package.json')).version;
    if (packageVersion === version) {
      pass(`package.json version matches VERSION: ${version}`);
    } else {
      fail(`package.json version (${packageVersion}) does not match VERSION (${version})`);
    }
  }
} else {
  fail('VERSION file missing');
}

// ── SUMMARY ─────────────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);

if (failed > 0) {
  console.log('🔴 TESTS FAILED — do NOT push/merge until fixed\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('🟡 Tests passed with warnings — review before pushing\n');
  process.exit(0);
} else {
  console.log('🟢 All tests passed — safe to push/merge\n');
  process.exit(0);
}
