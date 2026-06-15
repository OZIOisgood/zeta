import { readFileSync } from 'node:fs';

// Copy string values and apply documented defaults (EMAIL_DSA falls back to EMAIL).
export function resolveValues(raw) {
  const values = {};
  for (const [k, v] of Object.entries(raw || {})) if (typeof v === 'string') values[k] = v;
  if (!values.EMAIL_DSA || !values.EMAIL_DSA.trim()) values.EMAIL_DSA = values.EMAIL || '';
  return values;
}

export function loadValues(file) {
  try {
    return resolveValues(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    return resolveValues({});
  }
}

// Replace {{KEY}} with its value; leave the placeholder in place when the value is empty/missing.
export function applyValues(text, values) {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (token, key) => {
    const v = values[key];
    return typeof v === 'string' && v.trim() ? v : token;
  });
}

// Distinct {{PLACEHOLDER}} tokens still present in the text.
export function findPlaceholders(text) {
  return [...new Set(text.match(/\{\{[A-Z0-9_]+\}\}/g) || [])];
}
