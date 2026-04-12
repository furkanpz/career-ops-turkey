#!/usr/bin/env node

/**
 * cv-template-utils.mjs — Minimal helper for safe CV template selection.
 *
 * Purpose:
 * - Resolve a bilingual-safe template path without changing the PDF renderer.
 * - Keep legacy template behavior intact.
 * - Provide deterministic language and section-label fallbacks.
 *
 * This file does NOT render HTML or generate PDFs. It only resolves:
 * - template path
 * - normalized CV language
 * - output naming
 * - section label fallbacks
 */

import { existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEMPLATE_MAP = {
  legacy: 'templates/cv-template.html',
  en: 'templates/cv-template.en.html',
  tr: 'templates/cv-template.tr.html',
  es: 'templates/cv-template.html',
};

const SECTION_LABELS = {
  en: {
    SECTION_SUMMARY: 'Professional Summary',
    SECTION_COMPETENCIES: 'Core Competencies',
    SECTION_EXPERIENCE: 'Work Experience',
    SECTION_PROJECTS: 'Projects',
    SECTION_EDUCATION: 'Education',
    SECTION_CERTIFICATIONS: 'Certifications',
    SECTION_SKILLS: 'Skills',
  },
  tr: {
    SECTION_SUMMARY: 'Profesyonel Özet',
    SECTION_COMPETENCIES: 'Temel Yetkinlikler',
    SECTION_EXPERIENCE: 'Deneyim',
    SECTION_PROJECTS: 'Projeler',
    SECTION_EDUCATION: 'Eğitim',
    SECTION_CERTIFICATIONS: 'Sertifikalar',
    SECTION_SKILLS: 'Yetenekler',
  },
  es: {
    SECTION_SUMMARY: 'Resumen Profesional',
    SECTION_COMPETENCIES: 'Competencias Clave',
    SECTION_EXPERIENCE: 'Experiencia Profesional',
    SECTION_PROJECTS: 'Proyectos',
    SECTION_EDUCATION: 'Educación',
    SECTION_CERTIFICATIONS: 'Certificaciones',
    SECTION_SKILLS: 'Habilidades',
  },
};

export function normalizeCvLanguage(value = 'en') {
  const raw = String(value || '').trim().toLowerCase();

  if (!raw) return 'en';
  if (['tr', 'tr-tr', 'turkish', 'turkce', 'türkçe'].includes(raw)) return 'tr';
  if (['en', 'en-us', 'en-gb', 'english'].includes(raw)) return 'en';
  if (['es', 'es-es', 'spanish', 'espanol', 'español'].includes(raw)) return 'es';
  return null;
}

export function resolveCvTemplate({ language = 'en', template = null } = {}) {
  const normalizedLanguage = normalizeCvLanguage(language);
  const legacyPath = resolve(__dirname, TEMPLATE_MAP.legacy);

  if (!normalizedLanguage) {
    throw new Error(`Unsupported CV language: ${language}`);
  }

  if (template) {
    if (template in TEMPLATE_MAP) {
      const mappedPath = resolve(__dirname, TEMPLATE_MAP[template]);
      if (existsSync(mappedPath)) {
        return {
          language: template === 'legacy' ? normalizedLanguage : template,
          templateKey: template,
          templatePath: mappedPath,
          usedFallback: false,
        };
      }
    }

    const directPath = resolve(template);
    if (existsSync(directPath)) {
      return {
        language: normalizedLanguage,
        templateKey: 'custom',
        templatePath: directPath,
        usedFallback: false,
      };
    }
  }

  const preferredPath = resolve(__dirname, TEMPLATE_MAP[normalizedLanguage] || TEMPLATE_MAP.legacy);
  if (existsSync(preferredPath)) {
    return {
      language: normalizedLanguage,
      templateKey: normalizedLanguage === 'es' ? 'legacy' : normalizedLanguage,
      templatePath: preferredPath,
      usedFallback: false,
    };
  }

  return {
    language: normalizedLanguage,
    templateKey: 'legacy',
    templatePath: legacyPath,
    usedFallback: true,
  };
}

export function resolveCvSectionLabels(language = 'en', overrides = {}) {
  const normalizedLanguage = normalizeCvLanguage(language);
  if (!normalizedLanguage) {
    throw new Error(`Unsupported CV language: ${language}`);
  }
  const base = SECTION_LABELS[normalizedLanguage] || SECTION_LABELS.en;

  return {
    ...SECTION_LABELS.en,
    ...base,
    ...overrides,
  };
}

export function resolveCvOutputPaths({
  companySlug,
  date,
  language = 'en',
  outputDir = 'output',
  tempDir = '/tmp',
  legacyName = false,
} = {}) {
  if (!companySlug) {
    throw new Error('companySlug is required');
  }
  if (!date) {
    throw new Error('date is required');
  }

  const safeCompanySlug = String(companySlug)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const normalizedLanguage = normalizeCvLanguage(language);
  if (!normalizedLanguage) {
    throw new Error(`Unsupported CV language: ${language}`);
  }
  const stem = legacyName
    ? `cv-candidate-${safeCompanySlug}-${date}`
    : `cv-candidate-${safeCompanySlug}-${normalizedLanguage}-${date}`;

  return {
    language: normalizedLanguage,
    stem,
    htmlPath: join(tempDir, `${stem}.html`),
    pdfPath: join(outputDir, `${stem}.pdf`),
  };
}

function parseCliArgs(argv) {
  const options = {
    language: 'en',
    template: null,
    companySlug: null,
    date: null,
    legacyName: false,
  };

  for (const arg of argv) {
    if (arg.startsWith('--lang=')) options.language = arg.slice('--lang='.length);
    else if (arg.startsWith('--language=')) options.language = arg.slice('--language='.length);
    else if (arg.startsWith('--template=')) options.template = arg.slice('--template='.length);
    else if (arg.startsWith('--company-slug=')) options.companySlug = arg.slice('--company-slug='.length);
    else if (arg.startsWith('--date=')) options.date = arg.slice('--date='.length);
    else if (arg === '--legacy-name') options.legacyName = true;
  }

  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const template = resolveCvTemplate({
      language: options.language,
      template: options.template,
    });

    const result = {
      template,
      sections: resolveCvSectionLabels(template.language),
    };

    if (options.companySlug && options.date) {
      result.output = resolveCvOutputPaths({
        companySlug: options.companySlug,
        date: options.date,
        language: template.language,
        legacyName: options.legacyName,
      });
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
