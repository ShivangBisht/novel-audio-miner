/**
 * Word Model
 *
 * Responsibility:
 * - Classify raw Kuromoji tokens for reader display, comprehension, and mining.
 * - Keep vocabulary policy centralized and separate from tokenization.
 *
 * Stable policy:
 * - Proper nouns/names are separated and excluded from comprehension.
 * - Grammar/function tokens are ignored for learning calculations.
 * - Numeric/counter expressions are merged, e.g. 二十 + 歳 -> 二十歳.
 * - Broad compound merging is intentionally deferred until Token Inspector exists.
 */

const CONTENT_POS = new Set(['名詞', '動詞', '形容詞', '副詞', '代名詞']);
const GRAMMAR_POS = new Set(['助詞', '助動詞', '記号', '接続詞', '感動詞', '接頭詞', 'フィラー', 'その他']);
const GRAMMAR_DETAILS = new Set(['非自立', '接尾', '助数詞', '副詞可能']);
const PROPER_NOUN_DETAILS = new Set(['固有名詞', '人名', '姓', '名', '地名', '地域', '国', '組織']);
const NUMERIC_DETAILS = new Set(['数']);

const KANJI_NUMERALS = '零〇一二三四五六七八九十百千万億兆何幾';
const FULLWIDTH_DIGITS = '０１２３４５６７８９';
const NUMBER_PATTERN = new RegExp(`^[0-9${FULLWIDTH_DIGITS}${KANJI_NUMERALS}]+$`);
const HAS_NUMBER_PATTERN = new RegExp(`[0-9${FULLWIDTH_DIGITS}${KANJI_NUMERALS}]`);

const COUNTER_SURFACES = new Set([
  '歳', '才', '人', '名', '年', '年生', '月', '日', '日間', '週間',
  '回', '階', '番', '分', '秒', '時', '時間', '円', '個', '本', '冊',
  '枚', '匹', '頭', '台', '杯', '泊', '度', '件', '校', '巻', '章',
  'ページ', '頁', '話', '番目', '度目'
]);

const COUNTER_LIKE_CHARS = '歳才人名年月日回階番分秒時円個本冊枚匹頭台杯泊度件校巻章話頁';
const COUNTER_LIKE_PATTERN = new RegExp(`[${COUNTER_LIKE_CHARS}]`);

function hasAnyDetail(token, set) {
  return set.has(token.posDetail1) || set.has(token.posDetail2) || set.has(token.posDetail3);
}

function isNumberToken(token) {
  const surface = token?.surface || '';
  return hasAnyDetail(token || {}, NUMERIC_DETAILS) || NUMBER_PATTERN.test(surface);
}

function isCounterToken(token) {
  const surface = token?.surface || '';
  if (!surface) return false;
  if (COUNTER_SURFACES.has(surface)) return true;
  if (token.posDetail1 === '助数詞' || token.posDetail2 === '助数詞' || token.posDetail3 === '助数詞') return true;
  if ((token.posDetail1 === '接尾' || token.posDetail2 === '接尾' || token.posDetail3 === '接尾') && COUNTER_LIKE_PATTERN.test(surface)) return true;
  return false;
}

function looksNumericExpression(surface) {
  if (!surface) return false;
  const hasNumber = HAS_NUMBER_PATTERN.test(surface);
  if (!hasNumber) return false;
  const hasCounter = COUNTER_LIKE_PATTERN.test(surface) || [...COUNTER_SURFACES].some(counter => surface.endsWith(counter));
  return hasCounter || NUMBER_PATTERN.test(surface);
}

function mergeNumericCounterTokens(tokens) {
  const out = [];
  const source = tokens || [];

  for (let i = 0; i < source.length; i++) {
    const current = source[i];

    if (!isNumberToken(current)) {
      out.push(current);
      continue;
    }

    let merged = { ...current };
    let mergedAny = false;
    let j = i + 1;

    while (j < source.length && j <= i + 2 && isCounterToken(source[j])) {
      merged = {
        ...merged,
        surface: (merged.surface || '') + (source[j].surface || ''),
        dictionaryForm: (merged.dictionaryForm || merged.surface || '') + (source[j].dictionaryForm || source[j].surface || ''),
        pos: '名詞',
        posDetail1: '数詞表現',
        posDetail2: '',
        posDetail3: '',
        reading: (merged.reading || '') + (source[j].reading || '')
      };
      mergedAny = true;
      j += 1;
    }

    if (mergedAny) {
      out.push(merged);
      i = j - 1;
    } else {
      out.push(current);
    }
  }

  return out;
}

export function classifyToken(token) {
  const surface = token.surface || '';
  const dictionaryForm = token.dictionaryForm || surface;

  if (!surface) {
    return { ...token, surface, dictionaryForm, tokenCategory: 'ignored', colorRole: 'grammar', countsForComprehension: false, showInNewWords: false };
  }

  if (hasAnyDetail(token, PROPER_NOUN_DETAILS)) {
    return { ...token, surface, dictionaryForm, tokenCategory: 'proper-noun', colorRole: 'name', countsForComprehension: false, showInNewWords: false };
  }

  if (hasAnyDetail(token, NUMERIC_DETAILS) || token.posDetail1 === '数詞表現' || looksNumericExpression(surface)) {
    return { ...token, surface, dictionaryForm, tokenCategory: 'numeric', colorRole: 'numeric', countsForComprehension: false, showInNewWords: false };
  }

  if (GRAMMAR_POS.has(token.pos) || hasAnyDetail(token, GRAMMAR_DETAILS)) {
    return { ...token, surface, dictionaryForm, tokenCategory: 'grammar', colorRole: 'grammar', countsForComprehension: false, showInNewWords: false };
  }

  if (!CONTENT_POS.has(token.pos)) {
    return { ...token, surface, dictionaryForm, tokenCategory: 'ignored', colorRole: 'grammar', countsForComprehension: false, showInNewWords: false };
  }

  return { ...token, surface, dictionaryForm, tokenCategory: 'learning', colorRole: 'learning', countsForComprehension: true, showInNewWords: true };
}

export function classifyTokens(tokens) {
  return mergeNumericCounterTokens(tokens || []).map(classifyToken);
}

export function getDisplayWords(classifiedTokens) {
  return (classifiedTokens || []).filter(t => t.colorRole !== 'grammar');
}

export function getComprehensionWords(classifiedTokens) {
  return (classifiedTokens || []).filter(t => t.countsForComprehension);
}

export function getMiningCandidates(classifiedTokens) {
  return (classifiedTokens || []).filter(t => t.showInNewWords);
}
