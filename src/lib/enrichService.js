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

const NADESHIKO_API_KEY = 'nade_rGJBvOiBGNoLXjifckoSanCnSuoTtwjuhnlRqVVyhKyGZlGoxKRbgshSsJbifoMc';
const NADESHIKO_BASE_URL = 'https://nadeshiko.co';
const NADESHIKO_SEARCH_ENDPOINT = '/api/nadeshiko/v1/search';
const VOICEVOX_SPEAKER = 20;
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
    take: 15,
    filters: { contentRating: ['SAFE', 'SUGGESTIVE'] },
    include: ['media']
  };
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'nadeshiko-sdk-ts/2.1.0',
    'Accept': '*/*'
  };
  const sessionToken = getSessionToken();
  if (sessionToken) {
    headers['Cookie'] = `__Secure-nadeshiko.session_token=${sessionToken}`;
  } else {
    headers['X-API-Key'] = NADESHIKO_API_KEY;
  }
  const response = await fetch(NADESHIKO_SEARCH_ENDPOINT, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Nadeshiko API HTTP ${response.status}`);
  }
  return response.json();
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

function pickBestSegment(segments, targetWord, knownWords) {
  if (!segments.length) return null;
  const scoredAll = segments.map(seg => ({
    seg,
    ...scoreSegment(seg, targetWord, knownWords)
  }));
  scoredAll.sort((a, b) => a.score - b.score);
  const i1Candidates = scoredAll.filter(s => s.unknownCount <= 1 && s.contentLength >= MIN_CONTENT_LENGTH);
  if (i1Candidates.length > 0) return { segment: i1Candidates[0].seg, mode: 'i+1', stats: i1Candidates[0] };
  const i2Candidates = scoredAll.filter(s => s.unknownCount <= 2 && s.contentLength >= MIN_CONTENT_LENGTH);
  if (i2Candidates.length > 0) return { segment: i2Candidates[0].seg, mode: 'i+2', stats: i2Candidates[0] };
  const anyLong = scoredAll.filter(s => s.contentLength >= MIN_CONTENT_LENGTH);
  if (anyLong.length > 0) return { segment: anyLong[0].seg, mode: 'fallback', stats: anyLong[0] };
  const longest = scoredAll.reduce((a, b) => a.contentLength >= b.contentLength ? a : b);
  return { segment: longest.seg, mode: 'fallback-short', stats: longest };
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

function voicevoxFallback(novelSentence) {
  return {
    sentence: novelSentence,
    sentenceFurigana: novelSentence,
    translation: '',
    audioUrl: '',
    imageUrl: '',
    source: 'VOICEVOX (もち子さん)',
    unknownCount: 0,
    mode: 'tts-voicevox',
    method: 'voicevox'
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
      const { segment, mode, stats } = pickBestSegment(segments, trimmed, knownWords);
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
  }
  throw new Error('FALLBACK_TTS');
}

export async function autoEnrichWordWithFallback(word, novelSentence, ankiRequestFn, noteType, onProgress) {
  try {
    return await autoEnrichWord(word, ankiRequestFn, noteType, onProgress);
  } catch (err) {
    if (err.message === 'FALLBACK_TTS') {
      if (onProgress) onProgress('Generating VOICEVOX audio...');
      if (!novelSentence) throw new Error('No novel sentence available.');
      return voicevoxFallback(novelSentence);
    }
    throw err;
  }
}
