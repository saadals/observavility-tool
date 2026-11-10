#!/usr/bin/env node
/**
 * Verifies that Arabic and English translation files define the same keys,
 * and that every literal t('key') used in the source exists in English.
 * Plural suffixes (_zero, _one, _two, _few, _many, _other) are normalised.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const localeDir = join(root, 'src/i18n/locales');
const PLURAL = /_(zero|one|two|few|many|other)$/;

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out.add(key.replace(PLURAL, ''));
  }
  return out;
}

function load(lang) {
  const keys = new Set();
  for (const file of readdirSync(join(localeDir, lang))) {
    const data = JSON.parse(readFileSync(join(localeDir, lang, file), 'utf8'));
    const section = file.replace(/\.json$/, '');
    flatten(data, section === 'common' ? '' : section, keys);
  }
  return keys;
}

const en = load('en');
const ar = load('ar');
const missingAr = [...en].filter((k) => !ar.has(k));
const missingEn = [...ar].filter((k) => !en.has(k));

// Literal keys used in code
const used = new Set();
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name)) {
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.-]+)'/g)) used.add([m[1], relative(root, p)]);
    }
  }
}
walk(join(root, 'src'));
const unknown = [...used].filter(([k]) => !en.has(k) && ![...en].some((e) => e.startsWith(`${k}.`)));

let ok = true;
if (missingAr.length) {
  ok = false;
  console.error(`✗ ${missingAr.length} keys missing in ar:\n  ${missingAr.join('\n  ')}`);
}
if (missingEn.length) {
  ok = false;
  console.error(`✗ ${missingEn.length} keys missing in en:\n  ${missingEn.join('\n  ')}`);
}
if (unknown.length) {
  ok = false;
  console.error(`✗ ${unknown.length} keys used in code but not defined:\n  ${unknown.map(([k, f]) => `${k}  (${f})`).join('\n  ')}`);
}
if (ok) console.log(`✓ i18n OK — ${en.size} keys in en and ar, ${used.size} literal usages verified`);
process.exit(ok ? 0 : 1);
