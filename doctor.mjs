#!/usr/bin/env node

/**
 * doctor.mjs — Setup validation for career-ops
 * Checks all prerequisites and prints a pass/fail checklist.
 * Extended Turkey-ready profile validation remains intentionally non-enforcing;
 * see docs/tr-profile-schema.md for future checks.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

// ANSI colors (only on TTY)
const isTTY = process.stdout.isTTY;
const green = (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s;
const red = (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s;
const dim = (s) => isTTY ? `\x1b[2m${s}\x1b[0m` : s;
const PRIMARY_TR_PARSER_KEYS = [
  'linkedin_jobs_search',
  'kariyernet_search',
  'indeed_tr_search',
  'elemannet_search',
];

function detectMissingTrSearchParsers(portalsContent) {
  const lower = portalsContent.toLowerCase();
  const isTurkeyConfig = /parser_key:\s*(kariyernet_search|secretcv_search|yenibiris_search|iskur_search|linkedin_jobs_search)/i.test(portalsContent)
    || /locale:\s*(tr-tr|en-tr)/i.test(portalsContent)
    || /türkiye|turkiye|istanbul|ankara|izmir/i.test(lower);

  if (!isTurkeyConfig) {
    return [];
  }

  return PRIMARY_TR_PARSER_KEYS.filter((parserKey) => !new RegExp(`parser_key:\\s*${parserKey}\\b`, 'i').test(portalsContent));
}

function detectMissingTrProfileFields(profileContent) {
  let profile = null;
  try {
    profile = yaml.load(profileContent) || {};
  } catch {
    return ['config/profile.yml could not be parsed as YAML for extended Turkey profile checks'];
  }

  const modesDir = String(profile?.language?.modes_dir || '');
  const isTurkeyProfile = modesDir.includes('modes/tr') || profileContent.includes('cv_preferences');
  if (!isTurkeyProfile) return [];

  return [
    ['compensation.salary_preferences', profile?.compensation?.salary_preferences],
    ['language.cv_preferences', profile?.language?.cv_preferences],
    ['location_preferences', profile?.location_preferences],
    ['constraints', profile?.constraints],
    ['automation', profile?.automation],
  ].filter(([, value]) => !value).map(([label]) => label);
}

function checkNodeVersion() {
  const major = parseInt(process.versions.node.split('.')[0]);
  if (major >= 18) {
    return { pass: true, label: `Node.js >= 18 (v${process.versions.node})` };
  }
  return {
    pass: false,
    label: `Node.js >= 18 (found v${process.versions.node})`,
    fix: 'Install Node.js 18 or later from https://nodejs.org',
  };
}

function checkDependencies() {
  if (existsSync(join(projectRoot, 'node_modules'))) {
    return { pass: true, label: 'Dependencies installed' };
  }
  return {
    pass: false,
    label: 'Dependencies not installed',
    fix: 'Run: npm install',
  };
}

async function checkPlaywright() {
  try {
    const { chromium } = await import('playwright');
    const execPath = chromium.executablePath();
    if (existsSync(execPath)) {
      return { pass: true, label: 'Playwright chromium installed' };
    }
    return {
      pass: false,
      label: 'Playwright chromium not installed',
      fix: 'Run: npx playwright install chromium',
    };
  } catch {
    return {
      pass: false,
      label: 'Playwright chromium not installed',
      fix: 'Run: npx playwright install chromium',
    };
  }
}

function checkCv() {
  if (existsSync(join(projectRoot, 'cv.md'))) {
    return { pass: true, label: 'cv.md found' };
  }
  return {
    pass: false,
    label: 'cv.md not found',
    fix: [
      'Create cv.md in the project root with your CV in markdown',
      'See examples/ for reference CVs',
    ],
  };
}

function checkProfile() {
  const profilePath = join(projectRoot, 'config', 'profile.yml');
  if (existsSync(profilePath)) {
    const notes = [];
    const missingTrFields = detectMissingTrProfileFields(readFileSync(profilePath, 'utf-8'));
    if (missingTrFields.length > 0) {
      notes.push(`Optional Turkey profile fields missing: ${missingTrFields.join(', ')}`);
      notes.push('Scoring still works, but salary/location/constraint-aware recommendations are weaker until these are filled.');
    }
    return { pass: true, label: 'config/profile.yml found', notes };
  }
  return {
    pass: false,
    label: 'config/profile.yml not found',
    fix: [
      'Run: cp config/profile.tr.example.yml config/profile.yml',
      'Fallback: cp config/profile.example.yml config/profile.yml',
      'Then edit it with your details',
    ],
  };
}

function checkPortals() {
  const portalsPath = join(projectRoot, 'portals.yml');
  if (existsSync(portalsPath)) {
    const notes = [];
    const portalsContent = readFileSync(portalsPath, 'utf-8');
    const missingParsers = detectMissingTrSearchParsers(portalsContent);
    if (missingParsers.length > 0) {
      notes.push(`Missing primary Turkey search parsers: ${missingParsers.join(', ')}`);
      notes.push('Keep your custom portals.yml, but merge the missing starter entries if you want the full Turkey board coverage.');
    }
    return { pass: true, label: 'portals.yml found', notes };
  }
  return {
    pass: false,
    label: 'portals.yml not found',
    fix: [
      'Run: cp templates/portals.tr.example.yml portals.yml',
      'Fallback: cp templates/portals.example.yml portals.yml',
      'Then customize it for your own target roles, keywords, and companies',
    ],
  };
}

function checkFonts() {
  const fontsDir = join(projectRoot, 'fonts');
  if (!existsSync(fontsDir)) {
    return {
      pass: false,
      label: 'fonts/ directory not found',
      fix: 'The fonts/ directory is required for PDF generation',
    };
  }
  try {
    const files = readdirSync(fontsDir);
    if (files.length === 0) {
      return {
        pass: false,
        label: 'fonts/ directory is empty',
        fix: 'The fonts/ directory must contain font files for PDF generation',
      };
    }
  } catch {
    return {
      pass: false,
      label: 'fonts/ directory not readable',
      fix: 'Check permissions on the fonts/ directory',
    };
  }
  return { pass: true, label: 'Fonts directory ready' };
}

function checkAutoDir(name) {
  const dirPath = join(projectRoot, name);
  if (existsSync(dirPath)) {
    return { pass: true, label: `${name}/ directory ready` };
  }
  try {
    mkdirSync(dirPath, { recursive: true });
    return { pass: true, label: `${name}/ directory ready (auto-created)` };
  } catch {
    return {
      pass: false,
      label: `${name}/ directory could not be created`,
      fix: `Run: mkdir ${name}`,
    };
  }
}

async function main() {
  console.log('\ncareer-ops doctor');
  console.log('================\n');

  const checks = [
    checkNodeVersion(),
    checkDependencies(),
    await checkPlaywright(),
    checkCv(),
    checkProfile(),
    checkPortals(),
    checkFonts(),
    checkAutoDir('data'),
    checkAutoDir('output'),
    checkAutoDir('reports'),
  ];

  let failures = 0;

  for (const result of checks) {
    if (result.pass) {
      console.log(`${green('✓')} ${result.label}`);
      for (const note of result.notes || []) {
        console.log(`  ${dim('→ ' + note)}`);
      }
    } else {
      failures++;
      console.log(`${red('✗')} ${result.label}`);
      const fixes = Array.isArray(result.fix) ? result.fix : [result.fix];
      for (const hint of fixes) {
        console.log(`  ${dim('→ ' + hint)}`);
      }
    }
  }

  console.log('');
  if (failures > 0) {
    console.log(`Result: ${failures} issue${failures === 1 ? '' : 's'} found. Fix them and run \`npm run doctor\` again.`);
    process.exit(1);
  } else {
    console.log('Result: All checks passed. You\'re ready to go! Run `claude` to start.');
    console.log('');
    console.log('Join the community: https://discord.gg/8pRpHETxa4');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('doctor.mjs failed:', err.message);
  process.exit(1);
});
