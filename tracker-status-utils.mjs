#!/usr/bin/env node

/**
 * tracker-status-utils.mjs — Shared tracker status contract helpers.
 *
 * The single machine-readable source of truth lives in
 * tracker-status-registry.json so Node scripts and the Go dashboard stay aligned.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(__dirname, 'tracker-status-registry.json');
const REGISTRY = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));

function foldText(value) {
  return String(value ?? '')
    .replace(/\*\*/g, '')
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
    .replace(/[İIı]/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanStatus(raw) {
  return String(raw ?? '')
    .replace(/\*\*/g, '')
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
    .trim();
}

const STATUS_BY_LABEL = new Map();
const ALIAS_TO_STATUS = new Map();

for (const status of REGISTRY.tracker_statuses) {
  STATUS_BY_LABEL.set(status.label, status);
  ALIAS_TO_STATUS.set(foldText(status.label), status);
  ALIAS_TO_STATUS.set(foldText(status.group), status);
  for (const alias of status.aliases) {
    ALIAS_TO_STATUS.set(foldText(alias), status);
  }
}

export const TRACKER_CANONICAL_STATUSES = REGISTRY.tracker_statuses.map((status) => status.label);
export const TRACKER_STATUS_GROUPS = REGISTRY.tracker_statuses.map((status) => status.group);
export const TRACKER_STATUS_GROUP_ORDER = [...TRACKER_STATUS_GROUPS].sort((a, b) => {
  const orderA = REGISTRY.tracker_statuses.find((status) => status.group === a)?.display_order ?? 999;
  const orderB = REGISTRY.tracker_statuses.find((status) => status.group === b)?.display_order ?? 999;
  return orderA - orderB;
});
export const LISTING_LAYER_STATUSES = REGISTRY.listing_layer_statuses;
export const REPORT_MACHINE_KEYS = REGISTRY.report_machine_keys;

export function isCanonicalTrackerStatus(raw) {
  return STATUS_BY_LABEL.has(cleanStatus(raw).toUpperCase());
}

export function isListingLayerStatus(raw) {
  return LISTING_LAYER_STATUSES.includes(foldText(raw));
}

export function getTrackerStatusMeta(raw) {
  const cleaned = cleanStatus(raw);
  const folded = foldText(cleaned);

  if (!cleaned) {
    const meta = STATUS_BY_LABEL.get('DISCARDED');
    return {
      status: meta.label,
      group: meta.group,
      rank: meta.rank,
      canonical: false,
      reason: 'empty_status',
      description: meta.description,
    };
  }

  if (folded === '-' || folded === '—') {
    const meta = STATUS_BY_LABEL.get('DISCARDED');
    return {
      status: meta.label,
      group: meta.group,
      rank: meta.rank,
      canonical: false,
      reason: 'empty_marker',
      description: meta.description,
    };
  }

  if (isListingLayerStatus(folded)) {
    return {
      status: null,
      group: null,
      rank: null,
      canonical: false,
      reason: 'listing_layer_status',
      error: `Listing-layer status "${cleaned}" is not tracker-safe`,
    };
  }

  if (/^(duplicado|dup|repost)/i.test(folded)) {
    const meta = STATUS_BY_LABEL.get('DISCARDED');
    return {
      status: meta.label,
      group: meta.group,
      rank: meta.rank,
      canonical: false,
      reason: 'duplicate_like_alias',
      description: meta.description,
      moveToNotes: String(raw ?? '').trim(),
    };
  }

  const matched = ALIAS_TO_STATUS.get(folded);
  if (!matched) {
    return {
      status: null,
      group: null,
      rank: null,
      canonical: false,
      reason: 'unknown_status',
      error: `Unknown tracker status "${cleaned}"`,
    };
  }

  return {
    status: matched.label,
    group: matched.group,
    rank: matched.rank,
    canonical: foldText(matched.label) === folded,
    reason: foldText(matched.label) === folded ? 'canonical' : 'alias',
    description: matched.description,
  };
}

export function normalizeTrackerStatus(raw) {
  const meta = getTrackerStatusMeta(raw);
  return {
    status: meta.status,
    canonical: meta.canonical,
    reason: meta.reason,
    group: meta.group,
    rank: meta.rank,
    description: meta.description,
    error: meta.error,
    moveToNotes: meta.moveToNotes,
  };
}

export function normalizeTrackerStatusGroup(raw) {
  return getTrackerStatusMeta(raw).group;
}

export function getTrackerStatusRank(raw) {
  return getTrackerStatusMeta(raw).rank ?? 0;
}

export function looksLikeTrackerStatus(raw) {
  const cleaned = cleanStatus(raw);
  if (!cleaned) return false;
  if (isCanonicalTrackerStatus(cleaned)) return true;
  if (isListingLayerStatus(cleaned)) return true;
  if (/^(duplicado|dup|repost)/i.test(foldText(cleaned))) return true;
  return ALIAS_TO_STATUS.has(foldText(cleaned));
}
