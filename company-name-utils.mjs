#!/usr/bin/env node

/**
 * company-name-utils.mjs — Shared Turkish-safe company and role normalization.
 */

const LEGAL_SUFFIX_TOKENS = new Set([
  'a',
  's',
  'as',
  'anonim',
  'limited',
  'ltd',
  'sti',
  'sirket',
  'sirketi',
  'san',
  've',
  'tic',
]);

function foldTurkishText(value) {
  return String(value ?? '')
    .replace(/[İIı]/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function normalizeCompanyName(value) {
  const tokens = foldTurkishText(value)
    .replace(/&/g, ' and ')
    .replace(/['’`".,()/-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  while (tokens.length > 0 && LEGAL_SUFFIX_TOKENS.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  return tokens.join(' ').trim();
}

export function normalizeCompanyKey(value) {
  return normalizeCompanyName(value).replace(/\s+/g, '');
}

export function normalizeRoleTitle(value) {
  return foldTurkishText(value)
    .replace(/['’`".,()_-]/g, ' ')
    .replace(/[^a-z0-9/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
