/**
 * Enrichment service.
 *
 * Responsibility:
 * - Search Nadeshiko for example sentences, audio, images, and media metadata.
 * - Score candidate sentences using the local known-word cache.
 * - Fall back to VOICEVOX sentence audio when Nadeshiko is unavailable or TTS is forced.
 *
 * This module prepares enrichment data only. Anki note updates are handled by Reader.jsx.
 */

import { getKnownWords } from './wordCache.js';

const NADESHIKO_BASE_URL = 'https://nadeshiko.co';
const NADESHIKO_SEARCH_ENDPOINT = '/api/nadeshiko/v1/search';
const VOICEVOX_SPEAKER = 20;
const MIN_CONTENT_LENGTH = 5;
const FUNCTION_POS = new Set(['助詞', '助動詞', '補助記号']);

function getSessionToken() {
  try { return localStorage.getItem('nadeshiko_session_token') || ''; } catch { return ''; }
}


function isTtsForced() {
  try { return localStorage.getItem('force_tts') === 'true'; } catch { return false; }
}

function makeAbsoluteUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return NADESHIKO_BASE_URL + url;
  return `${NADESHIKO_BASE_URL}/${url}`;
}

function contentLength(text) {
  return (text || '').replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/g, '').length;
}


function buildFurigana(sentenceText, tokens) {
  if (!tokens || !tokens.length) return sentenceText || '';
  const sorted = [...tokens].sort((a, b) => a.b - b.b);
  let result = '';
  let lastEnd = 0;
  for (const token of sorted) {
    const surface = token.s || '';
    const reading = (token.r || '').replace(/[\u30A1-\u30FA]/g, c =>
      String.fromCharCode(c.charCodeAt(0) - 0x60)
    );
    if (token.b > lastEnd) result += sentenceText.slice(lastEnd, token.b);
    const hasKanji = /[\u4E00-\u9FFF]/.test(surface);
    if (hasKanji && reading && reading !== surface) {
      result += ` ${surface}[${reading}]`;
    } else {
      result += surface;
    }
    lastEnd = token.e;
  }
  if (lastEnd < sentenceText.length) result += sentenceText.slice(lastEnd);
  return result.replace(/\s+/g, '').trim();
}

async function searchNadeshiko(word) {
  if (isTtsForced()) throw new Error('TTS forced');
  const body = {
    query: { search: word },
    take: 50,
    filters: { contentRating: ['SAFE', 'SUGGESTIVE'] },
    include: ['media']
  };
  const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
  };
  const response = await fetch(NADESHIKO_SEARCH_ENDPOINT, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Nadeshiko API HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data || !Array.isArray(data.segments)) {
    throw new Error('Nadeshiko response did not contain a segments array.');
  }
  return data;
}

function scoreSegment(segment, targetWord, knownWords) {
  const tokens = segment.textJa?.tokens || [];
  let unknownCount = 0;
  for (const token of tokens) {
    const d = token.d || token.s || '';
    if (d === targetWord) continue;
    const pos = token.p || '';
    if (FUNCTION_POS.has(pos)) continue;
    if (!knownWords.has(d)) unknownCount++;
  }
  const hasAudio = !!segment.urls?.audioUrl;
  const clen = contentLength(segment.textJa?.content || '');
  const lengthBonus = Math.floor(clen / 5);
  const score = unknownCount * 10 - lengthBonus - (hasAudio ? 2 : 0);
  return { score, unknownCount, hasAudio, contentLength: clen };
}

export function pickBestSegment(segments, targetWord, knownWords) {
  if (!segments.length) return null;
  const scored = segments.map((seg, index) => ({
    seg,
    index,
    ...scoreSegment(seg, targetWord, knownWords)
  }));
  const containsTarget = item => {
    const sentence = item.seg.textJa?.content || '';
    const tokens = item.seg.textJa?.tokens || [];
    return sentence.includes(targetWord) || tokens.some(token => (token.d || token.s || '') === targetWord);
  };
  const isRepetitive = value => {
    const compact = String(value || '').replace(/\s+/g, '');
    if (compact.length < 8) return false;
    for (let size = 2; size <= Math.min(8, Math.floor(compact.length / 2)); size++) {
      const unit = compact.slice(0, size);
      if (unit.repeat(Math.ceil(compact.length / size)).slice(0, compact.length) === compact) return true;
    }
    return false;
  };
  const mediaRank = item => (item.seg.urls?.audioUrl ? 2 : 0) + (item.seg.urls?.imageUrl ? 1 : 0);
  const hasRequiredMedia = item => Boolean(item.seg.urls?.audioUrl && item.seg.urls?.imageUrl);
  const usable = scored
    .filter(containsTarget)
    .filter(item => item.contentLength >= MIN_CONTENT_LENGTH)
    .filter(item => !isRepetitive(item.seg.textJa?.content || ''));
  const sortMediaFirst = items => [...items].sort((a, b) =>
    Number(hasRequiredMedia(b)) - Number(hasRequiredMedia(a)) ||
    mediaRank(b) - mediaRank(a) ||
    a.score - b.score ||
    a.contentLength - b.contentLength ||
    a.index - b.index
  );
  const i1 = sortMediaFirst(usable.filter(item => item.unknownCount === 0));
  if (i1.length) return { segment: i1[0].seg, mode: 'i+1', stats: i1[0] };
  const hard = sortMediaFirst(usable.filter(item => item.unknownCount > 0));
  if (hard.length) return { segment: hard[0].seg, mode: 'hard-fallback', stats: hard[0] };
  const easy = [...scored]
    .filter(containsTarget)
    .sort((a, b) =>
      Number(hasRequiredMedia(b)) - Number(hasRequiredMedia(a)) ||
      mediaRank(b) - mediaRank(a) ||
      a.unknownCount - b.unknownCount ||
      a.contentLength - b.contentLength ||
      a.index - b.index
    );
  return easy.length
    ? { segment: easy[0].seg, mode: 'easy-fallback', stats: easy[0] }
    : null;
}

export async function generateVoicevoxAudio(text) {
  const queryResp = await fetch(
    `/api/voicevox/audio_query?text=${encodeURIComponent(text)}&speaker=${VOICEVOX_SPEAKER}`,
    { method: 'POST' }
  );

  if (!queryResp.ok) throw new Error(`VOICEVOX query failed (HTTP ${queryResp.status})`);

  const queryData = await queryResp.json();
  const synthResp = await fetch(`/api/voicevox/synthesis?speaker=${VOICEVOX_SPEAKER}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryData)
  });

  if (!synthResp.ok) throw new Error(`VOICEVOX synthesis failed (HTTP ${synthResp.status})`);

  const blob = await synthResp.blob();
  const audioBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return { audioBase64, filename: `voicevox_${Date.now()}.wav` };
}

function voicevoxFallback(novelSentence, fallbackReason = '') {
  return {
    sentence: novelSentence,
    sentenceFurigana: novelSentence,
    translation: '',
    audioUrl: '',
    imageUrl: '',
    source: 'VOICEVOX (ã‚‚ã¡å­ã•ã‚“)',
    unknownCount: 0,
    mode: 'tts-voicevox',
    method: 'voicevox',
    fallbackReason
  };
}

export async function autoEnrichWord(word, ankiRequestFn, noteType = 'Kiku', onProgress) {
  const trimmed = word.trim();
  if (!trimmed) throw new Error('No word provided');
  try {
    if (onProgress) onProgress('Searching Nadeshiko...');
    const data = await searchNadeshiko(trimmed);
    const segments = data?.segments || [];
    if (segments.length > 0) {
      if (onProgress) onProgress('Loading word knowledge...');
      const knownWords = await getKnownWords(ankiRequestFn, onProgress);
      if (onProgress) onProgress('Picking best sentence...');
      const selected = pickBestSegment(segments, trimmed, knownWords);
      if (!selected) throw new Error('Nadeshiko returned no sentence containing the target word.');
      const { segment, mode, stats } = selected;
      const sentence = segment.textJa?.content || '';
      const tokens = segment.textJa?.tokens || [];
      const sentenceFurigana = buildFurigana(sentence, tokens);
      const translation = segment.textEn?.content || '';
      const audioUrl = segment.urls?.audioUrl || '';
      const imageUrl = segment.urls?.imageUrl || '';
      const mediaInfo = data.includes?.media?.[segment.mediaPublicId];
      const sourceName = mediaInfo?.nameRomaji || mediaInfo?.nameEn || 'Nadeshiko';
      return {
        sentence, sentenceFurigana, translation,
        audioUrl: makeAbsoluteUrl(audioUrl),
        imageUrl: makeAbsoluteUrl(imageUrl),
        source: sourceName,
        unknownCount: stats?.unknownCount ?? 0,
        mode, method: 'nadeshiko'
      };
    }
  } catch (err) {
    console.warn('[Enrich] Nadeshiko failed:', err.message);
    throw Object.assign(new Error('FALLBACK_TTS'), {
      cause: new Error(err?.message || 'Nadeshiko lookup failed or returned no usable segments.')
    });
  }
  throw Object.assign(new Error('FALLBACK_TTS'), {
    cause: new Error('Nadeshiko returned no usable segments.')
  });
}

export async function autoEnrichWordWithFallback(word, novelSentence, ankiRequestFn, noteType, onProgress) {
  try {
    return await autoEnrichWord(word, ankiRequestFn, noteType, onProgress);
  } catch (err) {
    if (err.message === 'FALLBACK_TTS') {
      if (onProgress) onProgress('Generating VOICEVOX audio...');
      if (!novelSentence) throw new Error('No novel sentence available.');
      return voicevoxFallback(novelSentence, err?.cause?.message || 'Nadeshiko lookup did not return a usable segment.');
    }
    throw err;
  }
}
