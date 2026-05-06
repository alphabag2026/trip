/**
 * Translate missing keys from en.json to all other locale files
 * Uses the project's invokeLLM helper pattern via direct HTTP call
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../client/src/locales');

// Language codes and their names for translation prompts
const LANGUAGES = {
  ar: 'Arabic',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  hi: 'Hindi',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  mn: 'Mongolian',
  ms: 'Malay',
  nl: 'Dutch',
  pl: 'Polish',
  pt: 'Portuguese',
  ru: 'Russian',
  sv: 'Swedish',
  th: 'Thai',
  tl: 'Filipino/Tagalog',
  tr: 'Turkish',
  uk: 'Ukrainian',
  vi: 'Vietnamese',
  zh: 'Chinese (Simplified)'
};

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

function unflattenObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function translateBatch(texts, targetLang, langName) {
  const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL || 'https://forge.manus.im';
  const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
  
  if (!FORGE_KEY) {
    throw new Error('BUILT_IN_FORGE_API_KEY not set');
  }

  const prompt = `Translate the following JSON object values from English to ${langName}. 
Keep the JSON keys exactly the same. Only translate the values.
Keep any placeholders like {{name}}, {{count}}, etc. unchanged.
Keep HTML tags if any unchanged.
Return ONLY valid JSON, no explanation.

${JSON.stringify(texts, null, 2)}`;

  const response = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FORGE_KEY}`
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: `You are a professional translator. Translate UI text to ${langName}. Keep it natural and concise for UI display. Preserve all placeholders ({{variable}}) and HTML tags exactly.` },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Extract JSON from response (might be wrapped in ```json ... ```)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(`Failed to parse translation for ${targetLang}:`, jsonStr.substring(0, 200));
    return null;
  }
}

async function main() {
  // Load reference files
  const ko = JSON.parse(fs.readFileSync(path.join(localesDir, 'ko.json'), 'utf-8'));
  const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf-8'));
  
  const koFlat = flattenObject(ko);
  const enFlat = flattenObject(en);
  
  const targetLang = process.argv[2]; // Optional: translate single language
  const langsToProcess = targetLang ? { [targetLang]: LANGUAGES[targetLang] } : LANGUAGES;
  
  for (const [langCode, langName] of Object.entries(langsToProcess)) {
    console.log(`\n=== Processing ${langCode} (${langName}) ===`);
    
    const langFile = path.join(localesDir, `${langCode}.json`);
    const langData = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
    const langFlat = flattenObject(langData);
    
    // Find missing keys (exist in ko but not in this language)
    const missingKeys = {};
    for (const key of Object.keys(koFlat)) {
      if (!(key in langFlat)) {
        // Use English value as source for translation
        if (key in enFlat) {
          missingKeys[key] = enFlat[key];
        } else {
          missingKeys[key] = koFlat[key]; // Fallback to Korean
        }
      }
    }
    
    const missingCount = Object.keys(missingKeys).length;
    if (missingCount === 0) {
      console.log(`  ✓ No missing keys`);
      continue;
    }
    
    console.log(`  Missing ${missingCount} keys, translating in batches...`);
    
    // Split into batches of 50 keys (to avoid token limits)
    const BATCH_SIZE = 50;
    const keys = Object.keys(missingKeys);
    let translated = {};
    
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batchKeys = keys.slice(i, i + BATCH_SIZE);
      const batch = {};
      for (const k of batchKeys) {
        batch[k] = missingKeys[k];
      }
      
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(keys.length / BATCH_SIZE);
      console.log(`  Batch ${batchNum}/${totalBatches} (${batchKeys.length} keys)...`);
      
      try {
        const result = await translateBatch(batch, langCode, langName);
        if (result) {
          Object.assign(translated, result);
        } else {
          // If translation fails, use English as fallback
          Object.assign(translated, batch);
        }
      } catch (err) {
        console.error(`  Error in batch ${batchNum}: ${err.message}`);
        // Use English as fallback
        Object.assign(translated, batch);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Unflatten and merge
    const translatedNested = unflattenObject(translated);
    const merged = deepMerge(langData, translatedNested);
    
    // Write back
    fs.writeFileSync(langFile, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
    console.log(`  ✓ Written ${Object.keys(translated).length} translations to ${langCode}.json`);
  }
  
  console.log('\n=== Translation complete ===');
}

main().catch(console.error);
