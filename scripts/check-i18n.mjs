import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const messagesDir = path.join(__dirname, '../frontend/messages');

const whitelist = new Set([
  'YOLO', 'ResNet-50', 'Pakistan', 'Saudi Arabia', 'United Arab Emirates', 'Other',
  'Ajwa', 'Amber', 'Kalmi', 'Sagai', 'Rabbi', 'Zahedi', 'Mazafati', 'Mabroom',
  'Water Pump & Empress Market', 'Water Pump Market', 'Fruitelligence',
  '500k+', '100%', 'English', 'Orchard-Tech GitHub', 'YOLO · {ms} ms'
]);

// Include regex patterns for ICU templates
const isNumberOrVariablesOnly = (val) => {
  if (typeof val !== 'string') return false;
  const withoutVariables = val.replace(/\{[^}]+\}/g, '').trim();
  return withoutVariables === '' || !isNaN(Number(withoutVariables)) || /^[^\w]+$/.test(withoutVariables);
};

function flattenObj(obj, parent = '', res = {}) {
  for (let key in obj) {
    let propName = parent ? parent + '.' + key : key;
    if (typeof obj[key] == 'object') {
      flattenObj(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
}

try {
  const enRaw = fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf-8');
  const urRaw = fs.readFileSync(path.join(messagesDir, 'ur.json'), 'utf-8');
  const arRaw = fs.readFileSync(path.join(messagesDir, 'ar.json'), 'utf-8');

  const en = flattenObj(JSON.parse(enRaw));
  const ur = flattenObj(JSON.parse(urRaw));
  const ar = flattenObj(JSON.parse(arRaw));

  let hasErrors = false;

  // Check key equivalence
  const enKeys = new Set(Object.keys(en));
  const urKeys = new Set(Object.keys(ur));
  const arKeys = new Set(Object.keys(ar));

  const missingUr = [...enKeys].filter(k => !urKeys.has(k) && !k.startsWith('_review'));
  const missingAr = [...enKeys].filter(k => !arKeys.has(k) && !k.startsWith('_review'));
  const extraUr = [...urKeys].filter(k => !enKeys.has(k) && !k.startsWith('_review'));
  const extraAr = [...arKeys].filter(k => !enKeys.has(k) && !k.startsWith('_review'));

  if (missingUr.length) {
    console.error('Missing keys in ur.json:', missingUr);
    hasErrors = true;
  }
  if (missingAr.length) {
    console.error('Missing keys in ar.json:', missingAr);
    hasErrors = true;
  }
  if (extraUr.length) {
    console.error('Extra keys in ur.json:', extraUr);
    hasErrors = true;
  }
  if (extraAr.length) {
    console.error('Extra keys in ar.json:', extraAr);
    hasErrors = true;
  }

  // Check for untranslated strings (en == ur/ar)
  const untranslatedUr = [];
  const untranslatedAr = [];

  for (const key of enKeys) {
    const val = en[key];
    // Skip if in whitelist
    if (whitelist.has(val)) continue;
    // Skip if just numbers/symbols/ICU vars
    if (isNumberOrVariablesOnly(val)) continue;

    if (ur[key] && ur[key] === val) untranslatedUr.push(key);
    if (ar[key] && ar[key] === val) untranslatedAr.push(key);
  }

  if (untranslatedUr.length) {
    console.error('Potentially untranslated keys in ur.json (same as English):', untranslatedUr);
    hasErrors = true;
  }
  if (untranslatedAr.length) {
    console.error('Potentially untranslated keys in ar.json (same as English):', untranslatedAr);
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('\ni18n Check Failed. Please fix the above errors.');
    process.exit(1);
  } else {
    console.log('i18n Check Passed Successfully.');
  }

} catch (err) {
  console.error('Error running i18n check:', err.message);
  process.exit(1);
}
