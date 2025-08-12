const express = require('express');
const router = express.Router();

// Uses global fetch (Node 20+). If your runtime lacks it, install node-fetch.
const DEFAULT_LIBRE_URL = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de';

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
    const body = {
      source: detectedLang === 'ur' ? 'Arabic' : detectedLang,
      target: 'ISO',
      text,
    };
    const res = await fetchWithTimeout('https://aksharamukha-plugin.appspot.com/api/public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 7000);
    if (!res.ok) throw new Error('Aksharamukha failed');
    const data = await res.json();
    return (data && (data.text || data.output || data.result)) || null;
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
    return data?.translatedText || null;
  } catch (_) {
    return null;
  }
}

async function myMemoryTransliterate(text, detectedLang) {
  try {
    const from = detectedLang === 'auto' ? 'auto' : detectedLang;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|en`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) throw new Error('MyMemory failed');
    const data = await res.json();
    return data?.responseData?.translatedText || null;
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
    return data?.translation || null;
  } catch (_) {
    return null;
  }
}

async function microsoftTransliterate(text, detectedLang) {
  try {
    const key = process.env.MICROSOFT_TRANSLATOR_KEY;
    const region = process.env.MICROSOFT_TRANSLATOR_REGION;
    if (!key || !region) return null;

    const translitUrl = `https://api.cognitive.microsofttranslator.com/transliterate?api-version=3.0&language=${detectedLang}&fromScript=Arab&toScript=Latn`;
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
          return data[0].transliterations?.[0]?.text || data[0].text || data[0].transliteration || data[0].scriptText || null;
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

    const prompt = `Transliterate the following ${detectedLang === 'auto' ? '' : detectedLang} text into a Latin-script romanization preserving pronunciation. Return only the romanized text.\n\nText:\n${text}\n\nRomanization:`;

    const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.2,
      }),
    }, 10000);
    if (!res.ok) throw new Error('OpenAI failed');
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content;
    return out ? out.trim() : null;
  } catch (_) {
    return null;
  }
}

async function transliterateWithFailover(text) {
  if (!text || !text.trim()) return { original: text, lang: null, result: text, provider: null };
  const detectedLang = await detectLanguage(text);
  const providers = [
    { name: 'Aksharamukha', fn: aksharamukhaTransliterate },
    { name: 'LibreTranslate', fn: libreTranslateTransliterate },
    { name: 'MyMemory', fn: myMemoryTransliterate },
    { name: 'Lingva', fn: lingvaTransliterate },
    { name: 'Microsoft', fn: microsoftTransliterate },
    { name: 'OpenAI', fn: openAITransliterate },
  ];
  for (const p of providers) {
    try {
      const out = await p.fn(text, detectedLang);
      if (out && out.toString().trim()) {
        return { original: text, lang: detectedLang, result: out.toString().trim(), provider: p.name };
      }
    } catch (err) {
      // continue
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
