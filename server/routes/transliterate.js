const express = require('express');
const router = express.Router();

// Uses global fetch (Node 20+). If your runtime lacks it, install node-fetch.
const DEFAULT_LIBRE_URL = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de';

// Local romanization libs
let toRomaji, pinyin, transliterate;
let koRomanizeMod, heTransliterate;
try { toRomaji = require('wanakana').toRomaji; } catch (_) {}
try { pinyin = require('pinyin'); } catch (_) {}
try { transliterate = require('transliteration').transliterate; } catch (_) {}
// Optional: Korean and Hebrew romanizers if available
try { koRomanizeMod = require('hangul-romanization'); } catch (_) {}
try { heTransliterate = require('hebrew-transliteration').transliterate; } catch (_) {}

// Helper: fetch with timeout
async function fetchWithTimeout(url, opts = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Normalize AI outputs that sometimes include code fences or extra prose
function normalizeAIText(s) {
  if (!s) return s;
  // Remove code fences and extract content
  const m = s.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
  const inner = m ? m[1] : s;
  return inner.replace(/\r/g, '').trim();
}

// Heuristics: detect script by Unicode ranges (helps when external detect returns 'auto')
function detectScriptHeuristic(text) {
  const ranges = {
    devanagari: /[\u0900-\u097F]/, // Hindi, Marathi, etc.
    arabic: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, // Arabic, Urdu, Persian
    cyrillic: /[\u0400-\u04FF]/,
    greek: /[\u0370-\u03FF]/,
    hiragana: /[\u3040-\u309F]/,
    katakana: /[\u30A0-\u30FF\u31F0-\u31FF]/,
    hangul: /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/,
  hebrew: /[\u0590-\u05FF]/,
  thai: /[\u0E00-\u0E7F]/,
    cjk: /[\u4E00-\u9FFF]/, // CJK Unified Ideographs
    bengali: /[\u0980-\u09FF]/,
    gurmukhi: /[\u0A00-\u0A7F]/,
    gujarati: /[\u0A80-\u0AFF]/,
    tamil: /[\u0B80-\u0BFF]/,
    telugu: /[\u0C00-\u0C7F]/,
    kannada: /[\u0C80-\u0CFF]/,
    malayalam: /[\u0D00-\u0D7F]/,
    sinhala: /[\u0D80-\u0DFF]/,
  };
  for (const [name, re] of Object.entries(ranges)) {
    if (re.test(text)) return name;
  }
  return null;
}
// Map language codes to Microsoft fromScript and Aksharamukha source names
function langToScripts(lang, text) {
  const scriptHint = detectScriptHeuristic(text);
  const l = lang && lang !== 'auto' ? lang : (
    scriptHint === 'devanagari' ? 'hi' :
    scriptHint === 'arabic' ? 'ur' :
    scriptHint === 'bengali' ? 'bn' :
    scriptHint === 'gurmukhi' ? 'pa' :
    scriptHint === 'gujarati' ? 'gu' :
    scriptHint === 'tamil' ? 'ta' :
    scriptHint === 'telugu' ? 'te' :
    scriptHint === 'kannada' ? 'kn' :
    scriptHint === 'malayalam' ? 'ml' :
    scriptHint === 'sinhala' ? 'si' :
    scriptHint === 'hangul' ? 'ko' :
    scriptHint === 'hiragana' ? 'ja' :
    scriptHint === 'katakana' ? 'ja' :
    scriptHint === 'cjk' ? 'zh' :
    scriptHint === 'cyrillic' ? 'ru' :
    scriptHint === 'greek' ? 'el' :
    scriptHint === 'hebrew' ? 'he' :
    scriptHint === 'thai' ? 'th' :
    'auto'
  );
  
  const msFrom = {
    ur: 'Arab', ar: 'Arab', fa: 'Arab',
    hi: 'Deva', mr: 'Deva', ne: 'Deva',
    bn: 'Beng',
    pa: 'Guru',
    gu: 'Gujr',
    ta: 'Taml',
    te: 'Telu',
    kn: 'Knda',
    ml: 'Mlym',
    si: 'Sinh',
    ko: 'Hang',
  he: 'Hebr',
  th: 'Thai',
  };
  
  const akSrc = {
    ur: 'Arabic', ar: 'Arabic', fa: 'Arabic',
    hi: 'Devanagari', mr: 'Devanagari', ne: 'Devanagari',
    bn: 'Bengali',
    pa: 'Gurmukhi',
    gu: 'Gujarati',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    ml: 'Malayalam',
    si: 'Sinhala',
  he: null,
  th: null,
  };
  
  return {
    lang: l,
    msFromScript: msFrom[l] || null,
    aksharaSource: akSrc[l] || null,
  };
}

// Utility: split long text into chunks preserving lines, soft cap by characters
function chunkText(text, maxLen = 450) {
  const lines = (text || '').split(/\r?\n/);
  const chunks = [];
  let buf = '';
  for (const line of lines) {
    // If a single line is huge, hard-split it
    if (line.length > maxLen) {
      if (buf) { chunks.push(buf); buf = ''; }
      for (let i = 0; i < line.length; i += maxLen) {
        chunks.push(line.slice(i, i + maxLen));
      }
      continue;
    }
    if ((buf + (buf ? '\n' : '') + line).length > maxLen) {
      chunks.push(buf);
      buf = line;
    } else {
      buf += (buf ? '\n' : '') + line;
    }
  }
  if (buf) chunks.push(buf);
  return chunks.length ? chunks : [''];
}

// Heuristic: ensure output looks romanized (has Latin letters and reduces non-Latin share)
function isRomanized(original, output) {
  if (!output) return false;
  const latin = /[A-Za-z]/;
  if (!latin.test(output)) return false;
  // If original was already Latin-heavy, allow
  const nonLatinRe = /[^\x00-\x7F]/g;
  const origNonLatin = (original.match(nonLatinRe) || []).length;
  const outNonLatin = (output.match(nonLatinRe) || []).length;
  if (origNonLatin === 0) return true;
  return outNonLatin < origNonLatin;
}

// 2a) Local provider: Use lightweight libs for common scripts (CJK, Cyrillic, Greek)
async function localRomanize(text, detectedLang) {
  const script = detectScriptHeuristic(text) || '';
  try {
    let out = null;
  // Japanese kana => romaji
    if (script.includes('hiragana') || script.includes('katakana')) {
      if (toRomaji) out = toRomaji(text);
    } else if (script === 'cjk' || script === 'hiragana' || script === 'katakana') {
      // Try Japanese first (romaji for kana), then Chinese Pinyin if CJK ideographs
      if (!out && toRomaji && (/[\u3040-\u30FF]/.test(text))) {
        out = toRomaji(text);
      }
      if (!out && pinyin && /[\u4E00-\u9FFF]/.test(text)) {
        // Keep line breaks; map each line to pinyin
        out = text.split(/\r?\n/).map(line => {
          const arr = pinyin(line, { style: pinyin.STYLE_TONE, heteronym: false, segment: true });
          return arr.map(tok => Array.isArray(tok) ? tok.join('') : String(tok)).join(' ').trim();
        }).join('\n');
      }
    } else if (script === 'arabic') {
      // Prefer Aksharamukha/OpenAI for Arabic-derived scripts; local lib not reliable
      out = null;
    } else if (script === 'hangul') {
      // Korean Hangul
      if (koRomanizeMod) {
        try {
          const fn = koRomanizeMod.transliterate || koRomanizeMod.romanize || koRomanizeMod.default || null;
          if (typeof fn === 'function') out = fn(text);
        } catch (_) {}
      }
    } else if (script === 'cyrillic' || script === 'greek') {
      if (transliterate) out = transliterate(text);
    } else if (script === 'hebrew') {
      if (typeof heTransliterate === 'function') {
        try { out = heTransliterate(text); } catch (_) {}
      }
    } else if (
      script === 'bengali' || script === 'gurmukhi' || script === 'gujarati' || script === 'tamil' ||
      script === 'telugu' || script === 'kannada' || script === 'malayalam' || script === 'sinhala' ||
      script === 'devanagari'
    ) {
      // Leave Indic scripts to Aksharamukha/OpenAI
      out = null;
    } else if (/^[\x00-\x7F\s\p{P}]*$/u.test(text)) {
      // Already ASCII/punctuation-only (likely Latin or plain ASCII), skip
      out = null;
    }
    if (out && isRomanized(text, out) && out.trim() !== text.trim()) {
      return out;
    }
    return null;
  } catch (_) {
    return null;
  }
}

// 1) Language detection via LibreTranslate detect (public)
async function detectLanguage(text) {
  try {
    const res = await fetchWithTimeout(`${DEFAULT_LIBRE_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    }, 5000);
    if (!res.ok) return 'auto';
    const data = await res.json();
    return data?.[0]?.language || 'auto';
  } catch (_) {
    return 'auto';
  }
}

// 2) Providers
async function aksharamukhaTransliterate(text, detectedLang) {
  try {
    const { aksharaSource } = langToScripts(detectedLang, text);
    if (!aksharaSource) return null;
    const body = { source: aksharaSource, target: 'ISO', text };
    const res = await fetchWithTimeout('https://aksharamukha-plugin.appspot.com/api/public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 7000);
    if (!res.ok) throw new Error('Aksharamukha failed');
    const data = await res.json();
    const out = (data && (data.text || data.output || data.result)) || null;
    return out && isRomanized(text, out) ? out : null;
  } catch (_) {
    return null;
  }
}

async function libreTranslateTransliterate(text, detectedLang) {
  try {
    const res = await fetchWithTimeout(`${DEFAULT_LIBRE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: detectedLang === 'auto' ? 'auto' : detectedLang,
        target: 'en',
        format: 'text',
      }),
    }, 7000);
    if (!res.ok) throw new Error('LibreTranslate failed');
    const data = await res.json();
    const out = data?.translatedText || null;
    // This is translation, not transliteration; still acceptable as a final fallback
    // Avoid returning obvious error payloads
    if (out && /ERROR|EXCEEDED|INVALID/i.test(out)) return null;
  return out;
  } catch (_) {
    return null;
  }
}

async function myMemoryTransliterate(text, detectedLang) {
  try {
    const from = detectedLang === 'auto' ? null : detectedLang;
    // MyMemory has a 500 char limit for q and doesn't support 'auto' well; skip if unsuitable
    if (!from || text.length > 400) return null;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|en`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) throw new Error('MyMemory failed');
    const data = await res.json();
    if (data?.responseStatus !== 200) return null;
    const out = data?.responseData?.translatedText || null;
    if (out && /INVALID|EXCEEDED|QUERY LENGTH/i.test(out)) return null;
    return out;
  } catch (_) {
    return null;
  }
}

async function lingvaTransliterate(text, detectedLang) {
  try {
    const from = detectedLang === 'auto' ? 'auto' : detectedLang;
    const url = `https://lingva.ml/api/v1/${from}/en/${encodeURIComponent(text)}`;
    const res = await fetchWithTimeout(url, {}, 7000);
    if (!res.ok) throw new Error('Lingva failed');
    const data = await res.json();
    const out = data?.translation || null;
    if (out && /ERROR|EXCEEDED|INVALID/i.test(out)) return null;
    return out;
  } catch (_) {
    return null;
  }
}

async function microsoftTransliterate(text, detectedLang) {
  try {
    const key = process.env.MICROSOFT_TRANSLATOR_KEY;
    const region = process.env.MICROSOFT_TRANSLATOR_REGION;
    if (!key || !region) return null;

    const { lang, msFromScript } = langToScripts(detectedLang, text);
    if (!lang || lang === 'auto' || !msFromScript) return null;
    const translitUrl = `https://api.cognitive.microsofttranslator.com/transliterate?api-version=3.0&language=${lang}&fromScript=${msFromScript}&toScript=Latn`;
    try {
      const res = await fetchWithTimeout(translitUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ Text: text }]),
      }, 7000);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          const out = data[0].transliterations?.[0]?.text || data[0].text || data[0].transliteration || data[0].scriptText || null;
          return out && isRomanized(text, out) ? out : null;
        }
      }
    } catch (_) {}

    const translateUrl = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=en`;
    const res2 = await fetchWithTimeout(translateUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: text }]),
    }, 7000);
    if (!res2.ok) throw new Error('Microsoft translate failed');
    const data2 = await res2.json();
    return data2?.[0]?.translations?.[0]?.text || null;
  } catch (_) {
    return null;
  }
}

async function openAITransliterate(text, detectedLang) {
  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return null;

    const prompt = `Transliterate the following ${detectedLang === 'auto' ? '' : detectedLang} text into Latin-script (romanization), preserving pronunciation and line breaks. Do NOT translate. Return only the romanized text.\n\nText:\n${text}\n\nRomanization:`;

    const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.2,
      }),
    }, 10000);
    if (!res.ok) throw new Error('OpenAI failed');
    const data = await res.json();
  const out = normalizeAIText(data?.choices?.[0]?.message?.content);
  return out && isRomanized(text, out) ? out : null;
  } catch (_) {
    return null;
  }
}

async function transliterateWithFailover(text) {
  if (!text || !text.trim()) return { original: text, lang: null, result: text, provider: null };
  const detectedLang = await detectLanguage(text);
  const chunks = chunkText(text, 700);

  // Provider priority: transliteration first, then LibreTranslate translation as last resort
  const providers = [
    { name: 'Local', fn: localRomanize },
    { name: 'Aksharamukha', fn: aksharamukhaTransliterate },
    { name: 'OpenAI', fn: openAITransliterate },
    // Microsoft intentionally omitted (no keys provided)
    { name: 'LibreTranslate', fn: libreTranslateTransliterate },
  ];

  for (const p of providers) {
    try {
      const outChunks = [];
      for (const ch of chunks) {
        const out = await p.fn(ch, detectedLang);
        if (!out) { outChunks.length = 0; break; } // fail this provider on any chunk
        outChunks.push(out);
      }
      if (outChunks.length === chunks.length) {
        const joined = outChunks.join('\n');
        // Avoid returning identical content
        if (joined.trim() && joined.trim() !== text.trim()) {
          return { original: text, lang: detectedLang, result: joined, provider: p.name };
        }
      }
    } catch (_) {
      // try next provider
    }
  }
  return { original: text, lang: detectedLang, result: text, provider: 'none' };
}

router.post('/', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing text' });
    const out = await transliterateWithFailover(text);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
