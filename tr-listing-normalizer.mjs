#!/usr/bin/env node

/**
 * Runtime normalizer for Turkey-locale listing metadata.
 *
 * The tracker remains markdown-first; this module provides an additive JSONL
 * sidecar contract for scanner/dashboard consumers.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';

const DEFAULT_CONTRACT_VERSION = 'tr-listing-candidate/v1';

const CITY_ALIASES = [
  ['istanbul', ['istanbul', 'avrupa yakasi', 'anadolu yakasi']],
  ['ankara', ['ankara']],
  ['izmir', ['izmir']],
  ['kocaeli', ['kocaeli', 'gebze']],
  ['bursa', ['bursa']],
  ['eskisehir', ['eskisehir']],
  ['antalya', ['antalya']],
  ['adana', ['adana']],
  ['gaziantep', ['gaziantep']],
  ['mersin', ['mersin']],
  ['konya', ['konya']],
  ['sakarya', ['sakarya']],
  ['mugla', ['mugla']],
];

const SOURCE_SLUGS = new Map([
  ['linkedin', 'linkedin'],
  ['kariyer.net', 'kariyer_net'],
  ['kariyer', 'kariyer_net'],
  ['indeed', 'indeed_tr'],
  ['eleman.net', 'eleman_net'],
  ['eleman', 'eleman_net'],
  ['secretcv', 'secretcv'],
  ['yenibiris', 'yenibiris'],
  ['iskur', 'iskur'],
  ['youthall', 'youthall'],
  ['greenhouse', 'greenhouse'],
  ['ashby', 'ashby'],
  ['lever', 'lever'],
  ['workable', 'workable'],
  ['teamtailor', 'teamtailor'],
  ['company careers', 'company_careers'],
]);

function cleanWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function foldTrText(value) {
  return String(value ?? '')
    .replace(/[İIı]/g, 'i')
    .replace(/[Ğğ]/g, 'g')
    .replace(/[Üü]/g, 'u')
    .replace(/[Şş]/g, 's')
    .replace(/[Öö]/g, 'o')
    .replace(/[Çç]/g, 'c')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function combinedText(...values) {
  return foldTrText(values.filter(Boolean).join(' '));
}

function normalizeSourceSlug(value) {
  const normalized = foldTrText(value);
  for (const [needle, slug] of SOURCE_SLUGS.entries()) {
    if (normalized.includes(foldTrText(needle))) return slug;
  }
  return normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
}

export function canonicalizeTrListingUrl(url) {
  try {
    const parsed = new URL(url);
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
    return cleanWhitespace(url);
  }
}

export function normalizeTrCity(...values) {
  const text = combinedText(...values);
  for (const [city, aliases] of CITY_ALIASES) {
    if (aliases.some((alias) => new RegExp(`(^|[^a-z0-9])${alias}([^a-z0-9]|$)`).test(text))) {
      return city;
    }
  }
  return '';
}

export function normalizeTrWorkModel(...values) {
  const text = combinedText(...values);
  if (/\b(sahada|field|seyahatli|bolgede aktif ziyaret|mobil saha)\b/.test(text)) return 'field';
  if (/\bremote\s*[/+-]\s*hybrid\b|\bhybrid\s*[/+-]\s*remote\b|\buzaktan\s*[/+-]\s*hibrit\b/.test(text)) return 'unspecified';
  const hasRemote = /\b(remote|remotely|uzaktan|evden|home office|work from home)\b/.test(text);
  const hasHybrid = /\b(hybrid|hibrit|karma|ofis\s*\+\s*uzaktan)\b/.test(text);
  if (hasHybrid) return 'hybrid';
  if (hasRemote) return 'remote';
  if (/\b(on[-_ ]?site|office based|ofisten|ofis|sahada|yerinde)\b/.test(text)) return 'on_site';
  return 'unspecified';
}

export function normalizeTrLanguage(...values) {
  const text = combinedText(...values);
  if (/(^|[^a-z0-9])(?:tr[_-]?en|en[_-]?tr)([^a-z0-9]|$)/.test(text)) return 'tr_en';
  if (/\b(multilingual|cok dilli|çok dilli|birden fazla yabanci dil)\b/.test(text)) return 'multilingual';
  const hasEnglish = /\b(en|english|ingilizce|fluent english|advanced english|good command of english)\b/.test(text);
  const hasTurkish = /\b(tr|turkish|turkce|turkçe)\b/.test(text);
  if (hasEnglish && hasTurkish) return 'tr_en';
  if (hasEnglish) return 'en';
  if (hasTurkish) return 'tr';
  if (/\b(german|deutsch|almanca)\b/.test(text)) return 'de';
  if (/\b(french|fransizca|fransızca)\b/.test(text)) return 'fr';
  if (/\b(arabic|arapca|arapça)\b/.test(text)) return 'ar';
  if (/\b(russian|rusca|rusça)\b/.test(text)) return 'ru';
  return 'unspecified';
}

export function normalizeTrSeniority(...values) {
  const text = combinedText(...values);
  if (/\b(cto|cio|ceo|coo|chro|cfo|c-level|c level)\b/.test(text)) return 'c_level';
  if (/\b(vp|vice president|gmy)\b/.test(text)) return 'vp';
  if (/\b(head|bolum baskani|bölüm baskanı)\b/.test(text)) return 'head';
  if (/\b(director|direktor|direktör)\b/.test(text)) return 'director';
  if (/\b(manager|yonetici|yönetici|mudur|müdür|supervisor)\b/.test(text)) return 'manager';
  if (/\b(principal|basuzman|başuzman|chief architect)\b/.test(text)) return 'principal';
  if (/\b(staff|expert engineer)\b/.test(text)) return 'staff';
  if (/\b(lead|tech lead|team lead|takim lideri|takım lideri|ekip lideri)\b/.test(text)) return 'lead';
  if (/\b(staj|intern|internship)\b/.test(text)) return 'intern';
  if (/\b(yeni mezun|new grad|graduate program|management trainee|mt)\b/.test(text)) return 'new_grad';
  if (/\b(junior|jr|yeni mezun|new grad)\b/.test(text)) return 'junior';
  if (/\b(mid|middle|orta seviye|intermediate)\b/.test(text)) return 'mid';
  if (/\b(senior|sr|kidemli)\b/.test(text)) return 'senior';
  if (/\b(uzman yardimcisi|uzman yardımcısı|entry level|giris seviyesi|giriş seviyesi)\b/.test(text)) return 'junior';
  if (/\b(uzman|specialist|associate|engineer|developer)\b/.test(text)) return 'mid';
  return 'unspecified';
}

export function normalizeTrEmploymentType(...values) {
  const text = combinedText(...values);
  if (/\b(staj|intern|internship)\b/.test(text)) return 'internship';
  if (/\b(apprenticeship|ciraklik|çıraklık|aday programi|aday programı)\b/.test(text)) return 'apprenticeship';
  if (/\b(consulting basis|danismanlik|danışmanlık|consulting contract)\b/.test(text)) return 'consulting';
  if (/\b(freelance|serbest|bagimsiz calisma|bağımsız çalışma)\b/.test(text)) return 'freelance';
  if (/\b(temporary|gecici|geçici|donemsel|dönemsel|sezonluk)\b/.test(text)) return 'temporary';
  if (/\b(part[-_ ]?time|yari zamanli|part time)\b/.test(text)) return 'part_time';
  if (/\b(contract|contractor|freelance|sozlesmeli|donemsel)\b/.test(text)) return 'contract';
  if (/\b(full[-_ ]?time|tam zamanli|permanent|surekli)\b/.test(text)) return 'full_time';
  return 'unspecified';
}

export function normalizeTrSalaryTransparency(...values) {
  const raw = cleanWhitespace(values.filter(Boolean).join(' '));
  const text = foldTrText(raw);
  if (!raw) return { salaryTransparency: 'unknown', compensationText: '' };
  if (/\btransparent\b/.test(text)) return { salaryTransparency: 'transparent', compensationText: raw };
  if (/\bmarket_range\b/.test(text)) return { salaryTransparency: 'market_range', compensationText: raw };
  if (/\bopaque\b/.test(text)) return { salaryTransparency: 'opaque', compensationText: raw };
  if (/(₺|tl|try|eur|euro|usd|\$|maas|maaş|salary|compensation|net|brut|brüt|gross)/.test(text) && /\d/.test(text)) {
    return { salaryTransparency: 'transparent', compensationText: raw };
  }
  if (/\b(market|piyasa|competitive|rekabetci|rekabetçi)\b/.test(text)) {
    return { salaryTransparency: 'market_range', compensationText: raw };
  }
  if (/\b(belirtilmemis|belirtilmemiş|not specified|undisclosed)\b/.test(text)) {
    return { salaryTransparency: 'opaque', compensationText: raw };
  }
  return { salaryTransparency: 'unknown', compensationText: raw };
}

function inferCountryCode({ text, city, sourceType, parserKey }) {
  if (city) return 'TR';
  if (/\b(turkey|turkiye|türkiye|tr)\b/.test(text)) return 'TR';
  if (String(parserKey || '').endsWith('_search') || sourceType === 'job_board') return 'TR';
  return '';
}

function inferRegionScope({ text, city, workModel, countryCode }) {
  if (/\b(emea|europe|avrupa)\b/.test(text)) return 'emea';
  if (/\b(global|worldwide|dunya geneli)\b/.test(text)) return 'global';
  if (city) return 'city';
  if (countryCode === 'TR' || workModel === 'remote') return 'national';
  return 'unspecified';
}

function computeConfidenceScore(record, offer = {}) {
  let score = 0.45;
  if (record.source_type === 'company_careers') score = 0.86;
  else if (offer.discoveryMethod === 'direct_board_search') score = 0.76;
  else if (offer.discoveryMethod === 'json_api') score = 0.9;
  else if (offer.discoveryMethod === 'websearch_result') score = 0.55;

  if (record.city) score += 0.04;
  if (record.work_model !== 'unspecified') score += 0.04;
  if (record.language !== 'unspecified') score += 0.03;
  if (record.salary_transparency === 'transparent') score += 0.03;
  if (!record.company || !record.title || !record.url) score -= 0.2;
  if (String(offer.reviewReason || '').includes('public_unverified')) score -= 0.12;
  if (String(offer.reviewReason || '').includes('authwall_blocked')) score -= 0.18;

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

export function normalizeTrListingCandidate(offer = {}, options = {}) {
  const title = cleanWhitespace(offer.title || offer.role || '');
  const company = cleanWhitespace(offer.company || '');
  const url = cleanWhitespace(offer.url || offer.applyUrl || '');
  const canonicalUrl = cleanWhitespace(offer.canonicalUrl || canonicalizeTrListingUrl(url));
  const source = cleanWhitespace(offer.source || offer.queryName || 'Unknown');
  const sourceType = cleanWhitespace(offer.sourceType || offer.source_type || 'unknown');
  const parserKey = cleanWhitespace(offer.parserKey || offer.parser_key || '');
  const locationText = cleanWhitespace(offer.location || offer.location_text || '');
  const jdText = cleanWhitespace(offer.description || offer.snippet || options.description || '');
  const combined = combinedText(title, company, source, locationText, jdText, offer.reviewReason);
  const city = normalizeTrCity(locationText, title, jdText);
  const workModel = normalizeTrWorkModel(offer.workModel || offer.work_model || '', locationText, title, jdText);
  const language = normalizeTrLanguage(title, jdText, offer.language);
  const seniority = normalizeTrSeniority(title, jdText, offer.seniority);
  const employmentType = normalizeTrEmploymentType(title, jdText, offer.employmentType || offer.employment_type);
  const salary = normalizeTrSalaryTransparency(
    offer.compensationText ||
    offer.compensation_text ||
    offer.salary ||
    offer.salaryTransparency ||
    offer.salary_transparency ||
    ''
  );
  const countryCode = inferCountryCode({ text: combined, city, sourceType, parserKey });
  const regionScope = inferRegionScope({ text: combined, city, workModel, countryCode });
  const warnings = [];

  if (!url) warnings.push('missing_url');
  if (!title) warnings.push('missing_title');
  if (!company) warnings.push('missing_company');
  if (!city && !locationText) warnings.push('missing_location');
  if (workModel === 'unspecified') warnings.push('missing_work_model');
  if (language === 'unspecified') warnings.push('missing_language_signal');
  if (offer.discoveryMethod === 'websearch_result') warnings.push('generic_search_result');
  if (String(offer.reviewReason || '').includes('public_unverified')) warnings.push('public_unverified');
  if (String(offer.reviewReason || '').includes('authwall_blocked')) warnings.push('authwall_blocked');

  const record = {
    contract_version: DEFAULT_CONTRACT_VERSION,
    canonical_url: canonicalUrl || url,
    url,
    title,
    company,
    source,
    source_slug: normalizeSourceSlug(source),
    source_type: sourceType,
    parser_key: parserKey,
    apply_url: cleanWhitespace(offer.applyUrl || offer.apply_url || url),
    location_text: locationText,
    city,
    country_code: countryCode,
    region_scope: regionScope,
    work_model: workModel,
    seniority,
    language,
    employment_type: employmentType,
    compensation_text: salary.compensationText,
    salary_transparency: salary.salaryTransparency,
    posted_at: cleanWhitespace(offer.postedAt || offer.posted_at || ''),
    discovery_method: cleanWhitespace(offer.discoveryMethod || offer.discovery_method || ''),
    query_name: cleanWhitespace(offer.queryName || offer.query_name || ''),
    review_reason: cleanWhitespace(offer.reviewReason || offer.review_reason || ''),
    warnings,
    updated_at: options.updatedAt || new Date().toISOString(),
  };

  record.confidence_score = computeConfidenceScore(record, offer);
  if (record.confidence_score < 0.65 && !record.warnings.includes('low_confidence')) {
    record.warnings.push('low_confidence');
  }

  return record;
}

export function makeTrListingTags(recordOrOffer = {}) {
  const record = recordOrOffer.contract_version
    ? recordOrOffer
    : normalizeTrListingCandidate(recordOrOffer);
  const tags = [];
  if (record.city) tags.push(`city:${record.city}`);
  if (record.work_model && record.work_model !== 'unspecified') tags.push(`work_model:${record.work_model}`);
  if (record.language && record.language !== 'unspecified') tags.push(`lang:${record.language}`);
  if (record.salary_transparency === 'transparent') tags.push('salary:transparent');
  if (record.source_slug && record.source_slug !== 'unknown') tags.push(`source:${record.source_slug}`);
  if (Number.isFinite(record.confidence_score)) tags.push(`confidence:${record.confidence_score.toFixed(2)}`);
  return tags;
}

export function buildTrListingSidecarJsonl(existingText = '', offers = [], options = {}) {
  const byUrl = new Map();
  for (const line of String(existingText || '').split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      const key = parsed.canonical_url || canonicalizeTrListingUrl(parsed.url);
      if (key) byUrl.set(key, parsed);
    } catch {
      continue;
    }
  }

  for (const offer of offers) {
    const record = normalizeTrListingCandidate(offer, options);
    const key = record.canonical_url || record.url;
    if (!key) continue;
    byUrl.set(key, { ...(byUrl.get(key) || {}), ...record });
  }

  return [...byUrl.values()]
    .sort((left, right) => String(left.canonical_url || left.url).localeCompare(String(right.canonical_url || right.url)))
    .map((record) => JSON.stringify(record))
    .join('\n')
    .concat(byUrl.size > 0 ? '\n' : '');
}

export function upsertTrListingSidecar(path, offers = [], options = {}) {
  if (!path || !Array.isArray(offers) || offers.length === 0) return 0;
  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : '';
  const next = buildTrListingSidecarJsonl(existing, offers, options);
  writeFileSync(path, next, 'utf-8');
  return offers.length;
}
