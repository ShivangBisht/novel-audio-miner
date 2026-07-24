import { useEffect, useMemo, useState, useRef } from 'react';
import { getProgress, saveProgress } from '../lib/storage.js';
import { checkAnkiConnect, findLatestNote, updateNoteFields, ankiRequest } from '../lib/ankiConnect.js';
import { autoEnrichWordWithFallback, generateVoicevoxAudio } from '../lib/enrichService.js';
import { buildCache, clearCache, getCacheSize, addKnownWord, addManualKnownWord, removeManualKnownWord, isManualKnownWord, isKnownWord } from '../lib/wordCache.js';
import { getFrequency, startLoadingGlobalFrequency } from '../lib/frequencyMap.js';
import DictionaryDebugPanel from './DictionaryDebugPanel.jsx';
import JpAnalyzerIntegrationPanel from './JpAnalyzerIntegrationPanel.jsx';
import {
  clearJpAnalyzerShadowCache,
  useJpAnalyzerShadow
} from '../lib/useJpAnalyzerShadow.js';
import { adaptCompactAnalysisToReaderWords } from '../lib/analyzerWordAdapter.js';
import { adaptReaderSpansForRendering } from '../lib/analyzerReaderSpanAdapter.js';
import { compareReaderWordModels } from '../lib/analyzerShadowComparison.js';
import { findAdjacentTextScenes } from '../lib/scenePrefetch.js';
import { resolveAnalyzerPresentationClass } from '../lib/analyzerPresentationPolicy.js';
import { buildAnalyzerLearningModel, resolveLearningOwnership } from '../lib/analyzerLearningModel.js';
import { createAnalyzerReaderContext, getAnalyzerMiningLookupKey, getAnalyzerSelectionActionState, resolveAnalyzerReaderContextForOffsets } from '../lib/analyzerMiningSelection.js';
import {
  COLOR_SOURCES,
  normalizeColorSource,
  resolveVisibleColourSource
} from '../lib/colorSource.js';

/* ─── Constants ─── */
const DEFAULT_STYLE = { fontSize: 30, lineHeight: 2.05, height: 620, fontFamily: 'mincho' };
const DEFAULT_FIELDS = {
  expressionAudio: 'ExpressionAudio', selectionText: 'SelectionText',
  sentence: 'Sentence', sentenceFurigana: 'SentenceFurigana',
  sentenceAudio: 'SentenceAudio', picture: 'Picture', miscInfo: 'MiscInfo'
};
const FONT_STACKS = {
  mincho: '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif CJK JP","Noto Serif JP","Source Han Serif JP","IPAexMincho","Meiryo",serif',
  gothic: '"Hiragino Kaku Gothic ProN","Yu Gothic","YuGothic","Noto Sans CJK JP","Noto Sans JP","Source Han Sans JP","Meiryo",sans-serif'
};

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function cleanBookTitle(title) {
  return String(title || '').replace(/[（(]\s*電撃文庫\s*[）)]/g, '').replace(/【[^】]*(電子|特典|限定|版)[^】]*】/g, '').replace(/\s+/g, ' ').trim();
}

const dashRegex = /[—―─━ー]/;
const dashSingleRegex = /[—―─━ー]/g;

function fixDashesInHtml(html) {
  try { const div = document.createElement('div'); div.innerHTML = html; wrapIndividualDashes(div); return div.innerHTML; }
  catch { return html.replace(dashSingleRegex, '<span class="vertical-dash-fix">$&</span>'); }
}
function wrapIndividualDashes(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    if (!dashRegex.test(text)) return;
    const frag = document.createDocumentFragment();
    let lastIdx = 0, match;
    dashSingleRegex.lastIndex = 0;
    while ((match = dashSingleRegex.exec(text)) !== null) {
      if (match.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      const span = document.createElement('span'); span.className = 'vertical-dash-fix'; span.textContent = match[0];
      frag.appendChild(span);
      lastIdx = dashSingleRegex.lastIndex;
    }
    if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    node.parentNode.replaceChild(frag, node);
  } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) wrapIndividualDashes(node.childNodes[i]);
  }
}

/* ─── Word colour logic ─── */
function getTokenKnownKey(tokenOrWord) {
  if (typeof tokenOrWord === 'string') return tokenOrWord;
  return tokenOrWord?.knownLookupKey || tokenOrWord?.dictionaryForm || tokenOrWord?.surface || '';
}

function getTokenFrequencyKey(tokenOrWord) {
  if (typeof tokenOrWord === 'string') return tokenOrWord;
  return tokenOrWord?.frequencyLookupKey || getTokenKnownKey(tokenOrWord);
}

function isTokenKnownForLearning(tokenOrWord) {
  return isKnownWord(getTokenKnownKey(tokenOrWord));
}

function getWordColorClass(wordOrToken) {
  const token = typeof wordOrToken === 'object' ? wordOrToken : null;

  if (token?.analysisSource === 'jp-analyzer-reader-spans') {
    return resolveAnalyzerPresentationClass(token, {
      isKnown: isKnownWord,
      getFrequencyCategory: key => getFrequency(key)?.category ?? null
    });
  }

  const word = getTokenKnownKey(wordOrToken);
  if (token?.colorRole === 'neutral') return '';
  if (token?.colorRole === 'name' || token?.tokenCategory === 'proper-noun') return 'word-name';
  if (token?.colorRole === 'numeric' || token?.tokenCategory === 'numeric') return 'word-numeric';
  if (token?.colorRole === 'grammar' || token?.tokenCategory === 'grammar') return 'word-grammar';
  if (token?.colorRole === 'unknown' || token?.tokenCategory === 'unresolved') return 'word-unknown word-freq-unlisted';
  if (token?.tokenCategory === 'ignored') return 'word-grammar';
  if (!word) return 'word-unknown word-freq-unlisted';
  if (isKnownWord(word)) return 'word-known';
  const freq = getFrequency(word);
  if (freq && freq.category) return `word-unknown word-freq-${freq.category}`;
  return 'word-unknown word-freq-unlisted';
}


function yesNo(value) { return value ? 'yes' : 'no'; }
function truncateDebugText(text, maxLength = 80) {
  const source = String(text || '').replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return source.length <= maxLength ? source : `${source.slice(0, maxLength)}...`;
}
function safeJson(value) { try { return JSON.stringify(value ?? null, null, 2); } catch { return String(value || ''); } }
function getDisplayItemData(displayItem) { return displayItem?.data || displayItem || null; }
function getDisplayItemType(displayItem) {
  if (!displayItem) return 'none';
  if (displayItem.type === 'illustration') return 'image';
  if (displayItem.type === 'scene') return 'sentence';
  return displayItem.type || getDisplayItemData(displayItem)?.type || 'unknown';
}
function getDisplayItemPreview(displayItem) {
  const data = getDisplayItemData(displayItem);
  if (!data) return '';
  if (getDisplayItemType(displayItem) === 'image') return data.alt || '[image]';
  return truncateDebugText(data.plainText || data.htmlText || '', 90);
}
function getDebugTokenRows(currentData) {
  if (!currentData || currentData.type === 'image') return [];
  const sourceTokens = (currentData.classifiedWords && currentData.classifiedWords.length) ? currentData.classifiedWords : (currentData.tokens || []);
  return sourceTokens.map((token, index) => {
    const key = getTokenKnownKey(token);
    const freq = key ? getFrequency(key) : null;
    return {
      index, surface: token.surface || '', dictionaryForm: token.dictionaryForm || token.surface || '',
      pos: token.pos || '', posDetail1: token.posDetail1 || '', posDetail2: token.posDetail2 || '', posDetail3: token.posDetail3 || '',
      tokenCategory: token.tokenCategory || '', colorRole: token.colorRole || '', colorClass: getWordColorClass(token),
      known: key ? isKnownWord(key) : false, manualKnown: key ? isManualKnownWord(key) : false,
      frequency: freq ? `${freq.rank} / ${freq.category}` : 'unlisted',
      countsForComprehension: Boolean(token.countsForComprehension), showInNewWords: Boolean(token.showInNewWords)
    };
  });
}
function getSceneDebugSummary({ currentData, displayItem, itemIndex, totalScenes, isText, isImage, selectedText, unknownWords, comprehension, currentChapterImages }) {
  if (!currentData) return [];
  return [
    ['scene', `${itemIndex + 1} / ${totalScenes}`], ['displayItemType', getDisplayItemType(displayItem)], ['dataType', currentData.type || (isImage ? 'image' : 'sentence')],
    ['isText', yesNo(isText)], ['isImage', yesNo(isImage)], ['chapter', currentData.chapterTitle || ''], ['chapterIndex', String(currentData.chapterIndex ?? '')],
    ['selectedText', selectedText || ''], ['unknownWords', String((unknownWords || []).length)], ['comprehension', comprehension ? `${comprehension.percent}% (${comprehension.known}/${comprehension.total})` : 'n/a'],
    ['plainTextLength', String((currentData.plainText || '').length)], ['htmlTextLength', String((currentData.htmlText || '').length)], ['tokens', String((currentData.tokens || []).length)],
    ['classifiedWords', String((currentData.classifiedWords || []).length)], ['displayWords', String((currentData.displayWords || []).length)], ['comprehensionWords', String((currentData.comprehensionWords || []).length)],
    ['miningCandidates', String((currentData.miningCandidates || []).length)], ['chapterImages', String((currentChapterImages || []).length)], ['imageAlt', isImage ? (currentData.alt || '') : ''], ['imageDataUri', isImage ? yesNo(Boolean(currentData.dataUri)) : '']
  ];
}
function getNearbySceneRows(displayItems, itemIndex) {
  const rows = [];
  for (let offset = -2; offset <= 2; offset += 1) {
    const index = itemIndex + offset;
    if (index < 0 || index >= displayItems.length) continue;
    const displayItem = displayItems[index]; const data = getDisplayItemData(displayItem);
    rows.push({ index, relative: offset === 0 ? 'current' : (offset > 0 ? `+${offset}` : String(offset)), type: getDisplayItemType(displayItem), chapterIndex: data?.chapterIndex ?? '', chapterTitle: data?.chapterTitle || '', preview: getDisplayItemPreview(displayItem), parserDebug: data?.parserDebug || null });
  }
  return rows;
}
function getMiningDebugRows(miningDebug) {
  if (!miningDebug) return [];
  return [['status', miningDebug.status || ''], ['stage', miningDebug.stage || ''], ['startedAt', miningDebug.startedAt || ''], ['updatedAt', miningDebug.updatedAt || ''], ['selectedWord', miningDebug.selectedWord || ''], ['noteType', miningDebug.noteType || ''], ['scene', miningDebug.scene || ''], ['chapter', miningDebug.chapterTitle || ''], ['latestNoteQuery', miningDebug.latestNoteQuery || ''], ['latestNoteId', miningDebug.latestNoteId ? String(miningDebug.latestNoteId) : ''], ['latestNoteCount', miningDebug.latestNoteCount != null ? String(miningDebug.latestNoteCount) : ''], ['enrichmentMethod', miningDebug.enrichmentMethod || ''], ['source', miningDebug.source || ''], ['mode', miningDebug.mode || ''], ['unknownCount', miningDebug.unknownCount != null ? String(miningDebug.unknownCount) : ''], ['hasAudioUrl', miningDebug.hasAudioUrl != null ? yesNo(miningDebug.hasAudioUrl) : ''], ['hasImageUrl', miningDebug.hasImageUrl != null ? yesNo(miningDebug.hasImageUrl) : ''], ['sentenceAudio', miningDebug.sentenceAudio || ''], ['picture', miningDebug.picture || ''], ['error', miningDebug.error || '']];
}
function getParserDebugRows(currentData, displayItem, book) {
  const data = currentData || getDisplayItemData(displayItem) || {}; const parser = data.parserDebug || {}; const bookDebug = book?.debug || {};
  return [['bookDebugAvailable', yesNo(Boolean(bookDebug && Object.keys(bookDebug).length))], ['tocCount', String(bookDebug.tocCount ?? '')], ['totalItems', String(bookDebug.totalItems ?? '')], ['sentenceCount', String(bookDebug.sentenceCount ?? '')], ['imageCount', String(bookDebug.imageCount ?? '')], ['pageHref', parser.pageHref || ''], ['pageIndex', parser.pageIndex != null ? String(parser.pageIndex) : ''], ['orderedIndex', parser.orderedIndex != null ? String(parser.orderedIndex) : ''], ['itemType', parser.itemType || getDisplayItemType(displayItem)], ['chapterIndex', parser.chapterIndex != null ? String(parser.chapterIndex) : String(data.chapterIndex ?? '')], ['chapterTitle', parser.chapterTitle || data.chapterTitle || ''], ['imageSrc', parser.imageSrc || ''], ['resolvedZipPath', parser.resolvedZipPath || ''], ['imageExists', parser.imageExists != null ? yesNo(parser.imageExists) : ''], ['dataUri', parser.hasDataUri != null ? yesNo(parser.hasDataUri) : yesNo(Boolean(data.dataUri))], ['alt', parser.alt || data.alt || ''], ['plainTextLength', parser.plainTextLength != null ? String(parser.plainTextLength) : String((data.plainText || '').length)], ['htmlTextLength', parser.htmlTextLength != null ? String(parser.htmlTextLength) : String((data.htmlText || '').length)]];
}
function getChapterDebugRows(book, chapterImageLists) {
  const chapters = book?.debug?.chapterList || [];
  return chapters.map((chapter, index) => ({ index, title: chapter.title || '', sentenceCount: chapter.sentenceCount ?? '', imageCount: chapter.imageCount ?? (chapterImageLists?.[index]?.length ?? 0), preview: chapter.preview || '' }));
}
function buildDebugReport({ book, itemIndex, totalScenes, currentData, currentDisplayItem, selectedText, comprehension, unknownWords, debugTokenRows, debugSceneRows, debugNearbyRows, parserDebugRows, chapterDebugRows, miningDebug, ankiStatus, globalFreqReady, forceTts, readerStyle, showFurigana, verticalMode }) {
  return { app: { name: 'Novel Audio Miner', debugVersion: 'v5-export-report', generatedAt: new Date().toISOString() }, book: { id: book?.id || '', fileName: book?.fileName || '', title: book?.title || '', author: book?.author || '', tocCount: book?.toc?.length || 0, chapterCount: book?.chapters?.length || 0, debug: book?.debug || null }, reader: { sceneIndex: itemIndex, sceneNumber: itemIndex + 1, totalScenes, selectedText: selectedText || '', showFurigana: Boolean(showFurigana), verticalMode: Boolean(verticalMode), readerStyle, ankiStatus, globalFreqReady: Boolean(globalFreqReady), forceTts: Boolean(forceTts) }, currentScene: { displayItemType: getDisplayItemType(currentDisplayItem), chapterIndex: currentData?.chapterIndex ?? null, chapterTitle: currentData?.chapterTitle || '', plainText: currentData?.plainText || '', htmlText: currentData?.htmlText || '', imageAlt: currentData?.alt || '', hasImageDataUri: Boolean(currentData?.dataUri), parserDebug: currentData?.parserDebug || null }, comprehension: comprehension || null, unknownWords: (unknownWords || []).map(item => ({ word: item.word || '', surface: item.surface || '', frequency: item.freq || null })), debugPanels: { sceneRows: debugSceneRows, tokenRows: debugTokenRows, nearbyRows: debugNearbyRows, parserRows: parserDebugRows, chapterRows: chapterDebugRows, mining: miningDebug || null } };
}
function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

/* ─── Stable token range colouriser ─── */
function normalizeTokenList(tokens) {
  const normalized = (tokens || [])
    .filter(token => token?.surface)
    .map(token => ({
      ...token,
      surface: String(token.surface || ''),
      dictionaryForm:
        token.analysisSource === 'jp-analyzer-reader-spans'
          ? String(token.dictionaryForm ?? '')
          : String(token.dictionaryForm || token.surface || '')
    }))
    .filter(token => token.surface.length > 0);

  const allHaveOffsets = normalized.length > 0 && normalized.every(
    token => Number.isInteger(token.start) && Number.isInteger(token.end)
  );

  if (allHaveOffsets) {
    return normalized.sort((a, b) => a.start - b.start || a.end - b.end);
  }

  return normalized.sort((a, b) => b.surface.length - a.surface.length);
}

function buildTokenRangesFromText(text, tokens) {
  const source = text || '';
  const normalized = normalizeTokenList(tokens);
  const ranges = [];
  const occupied = new Array(source.length).fill(false);

  for (const token of normalized) {
    const exactStart = Number.isInteger(token.start) ? token.start : null;
    const exactEnd = Number.isInteger(token.end) ? token.end : null;
    const hasValidExactRange =
      exactStart !== null &&
      exactEnd !== null &&
      exactStart >= 0 &&
      exactEnd > exactStart &&
      exactEnd <= source.length &&
      source.slice(exactStart, exactEnd) === token.surface;

    if (hasValidExactRange) {
      const overlaps = occupied.slice(exactStart, exactEnd).some(Boolean);
      if (!overlaps) {
        for (let i = exactStart; i < exactEnd; i++) occupied[i] = true;
        ranges.push({
          start: exactStart,
          end: exactEnd,
          className: getWordColorClass(token),
          surface: token.surface
        });
        continue;
      }
    }

    let searchFrom = 0;
    while (searchFrom < source.length) {
      const start = source.indexOf(token.surface, searchFrom);
      if (start === -1) break;
      const end = start + token.surface.length;
      const overlaps = occupied.slice(start, end).some(Boolean);
      if (!overlaps) {
        for (let i = start; i < end; i++) occupied[i] = true;
        ranges.push({ start, end, className: getWordColorClass(token), surface: token.surface });
        break;
      }
      searchFrom = start + 1;
    }
  }

  return ranges.sort((a, b) => a.start - b.start || b.end - a.end);
}

function renderTextFragment(text, verticalMode, keyPrefix) {
  if (!verticalMode) return text;
  return renderChars(text, true, keyPrefix);
}

function renderColorizedPlainText(text, tokens, verticalMode) {
  const source = text || '';
  if (!source) return '';
  const ranges = buildTokenRangesFromText(source, tokens);
  if (!ranges.length) return renderTextFragment(source, verticalMode, 'plain-all');
  const parts = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) parts.push(<span key={`plain-gap-${index}`}>{renderTextFragment(source.slice(cursor, range.start), verticalMode, `plain-gap-${index}`)}</span>);
    parts.push(<span key={`plain-token-${index}`} className={range.className} data-token={range.surface} data-analyzer-start={range.start} data-analyzer-end={range.end}>{renderTextFragment(source.slice(range.start, range.end), verticalMode, `plain-token-${index}`)}</span>);
    cursor = range.end;
  });
  if (cursor < source.length) parts.push(<span key="plain-tail">{renderTextFragment(source.slice(cursor), verticalMode, 'plain-tail')}</span>);
  return parts;
}

function collectVisibleTextNodes(root) {
  const nodes = [];
  let text = '';
  function walk(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent || ['RT', 'RP', 'SCRIPT', 'STYLE'].includes(parent.tagName)) return;
      const start = text.length;
      text += node.textContent || '';
      const end = text.length;
      if (end > start) nodes.push({ node, start, end });
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (['RT', 'RP', 'SCRIPT', 'STYLE'].includes(node.tagName)) return;
      for (const child of [...node.childNodes]) walk(child);
    }
  }
  walk(root);
  return { text, nodes };
}

function applyRangesToVisibleTextNodes(nodes, ranges) {
  const byNodeIndex = new Map();
  for (const range of ranges) {
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      const info = nodes[nodeIndex];
      const start = Math.max(range.start, info.start);
      const end = Math.min(range.end, info.end);
      if (start < end) {
        if (!byNodeIndex.has(nodeIndex)) byNodeIndex.set(nodeIndex, []);
        byNodeIndex.get(nodeIndex).push({ localStart: start - info.start, localEnd: end - info.start, className: range.className, surface: range.surface, analyzerStart: range.start, analyzerEnd: range.end });
      }
    }
  }
  [...byNodeIndex.entries()].sort((a, b) => b[0] - a[0]).forEach(([nodeIndex, segments]) => {
    const node = nodes[nodeIndex].node;
    if (!node.parentNode) return;
    const text = node.textContent || '';
    const ordered = segments
      .sort((a, b) => a.localStart - b.localStart || b.localEnd - a.localEnd)
      .filter((segment, index, arr) => index === 0 || segment.localStart >= arr[index - 1].localEnd);
    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const segment of ordered) {
      if (segment.localStart > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, segment.localStart)));
      const matched = text.slice(segment.localStart, segment.localEnd);
      if (matched) {
        const span = document.createElement('span');
        span.className = segment.className;
        span.dataset.token = segment.surface;
        span.dataset.analyzerStart = String(segment.analyzerStart);
        span.dataset.analyzerEnd = String(segment.analyzerEnd);
        span.textContent = matched;
        frag.appendChild(span);
      }
      cursor = segment.localEnd;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode.replaceChild(frag, node);
  });
}

function colorizeHtmlByVisibleTextRanges(html, tokens) {
  if (!tokens || tokens.length === 0) return html;
  try {
    const div = document.createElement('div');
    div.innerHTML = html;
    const { text, nodes } = collectVisibleTextNodes(div);
    const ranges = buildTokenRangesFromText(text, tokens);
    if (!ranges.length) return div.innerHTML;
    applyRangesToVisibleTextNodes(nodes, ranges);
    wrapIndividualDashes(div);
    return div.innerHTML;
  } catch (error) {
    console.warn('[Reader] Failed to colorize furigana HTML:', error);
    return html;
  }
}

function renderStableSentence({ htmlText, plainText, tokens, showFurigana, verticalMode }) {
  if (showFurigana) {
    const html = htmlText || plainText || '';
    return <span dangerouslySetInnerHTML={{ __html: colorizeHtmlByVisibleTextRanges(html, tokens) }} />;
  }
  return <span>{renderColorizedPlainText(plainText || '', tokens, verticalMode)}</span>;
}

/* ─── Vertical plain text ─── */
function renderChars(text, verticalMode, keyPrefix = 'c') {
  if (!verticalMode) return (text || '');
  const parts = [], str = text || '';
  let lastIdx = 0, match;
  dashSingleRegex.lastIndex = 0;
  while ((match = dashSingleRegex.exec(str)) !== null) {
    if (match.index > lastIdx) parts.push(str.slice(lastIdx, match.index));
    parts.push(<span key={`${keyPrefix}-${lastIdx}`} className="vertical-dash-fix">{match[0]}</span>);
    lastIdx = dashSingleRegex.lastIndex;
  }
  if (lastIdx < str.length) parts.push(str.slice(lastIdx));
  return parts.length ? parts : str;
}

function getSelectedWord() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return '';
  const text = sel.toString().trim();
  if (text && !text.includes(' ') && text.length < 20) return text;
  const range = sel.getRangeAt(0);
  if (!range.startContainer || range.startContainer.nodeType !== 3) return text;
  const fullText = range.startContainer.textContent || '';
  let start = range.startOffset, end = range.endOffset;
  while (start > 0 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/.test(fullText[start - 1])) start--;
  while (end < fullText.length && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/.test(fullText[end])) end++;
  return fullText.slice(start, end).trim();
}

/* ─── Component ─── */
export default function Reader({ book, flatItems, chapterImageLists, onLoadAnotherBook }) {
  const saved = getProgress(book.id) || {};
  const [itemIndex, setItemIndex] = useState(() => saved.itemIndex || 0);
  const [showFurigana, setShowFurigana] = useState(() => saved.showFurigana || false);
  const [verticalMode, setVerticalMode] = useState(() => saved.verticalMode ?? true);
  const [readerStyle, setReaderStyle] = useState(() => ({ ...DEFAULT_STYLE, ...(saved.readerStyle || {}) }));
  const [selectedText, setSelectedText] = useState('');
  const [selectedReaderContext, setSelectedReaderContext] = useState(null);
  const [selectionIssue, setSelectionIssue] = useState('');
  const [noteType, setNoteType] = useState(() => saved.noteType || 'Kiku');
  const [fields, setFields] = useState(() => ({ ...DEFAULT_FIELDS, ...(saved.fields || {}) }));

  const [sidebarOpen, setSidebarOpen] = useState(() => saved.sidebarOpen ?? true);
  const [showStyle, setShowStyle] = useState(false);
  const [ankiStatus, setAnkiStatus] = useState({ connected: false, message: 'Not checked' });
  const [cacheVersion, setCacheVersion] = useState(0);
  const [globalFreqReady, setGlobalFreqReady] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => { try { return localStorage.getItem('nadeshiko_session_token') || ''; } catch { return ''; } });
  const [forceTts, setForceTts] = useState(() => { try { return localStorage.getItem('force_tts') === 'true'; } catch { return false; } });
  const [debugMode, setDebugMode] = useState(saved.debugMode ?? false);
  const hasSavedColorSource = Object.prototype.hasOwnProperty.call(
    saved,
    'colorSource'
  );
  const [colorSource, setColorSource] = useState(() =>
    normalizeColorSource(saved.colorSource)
  );
  const [miningDebug, setMiningDebug] = useState(null);
  const [unblurredImages, setUnblurredImages] = useState(new Set());
  const [goInput, setGoInput] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [enrichResult, setEnrichResult] = useState(null);
  const [isWorking, setIsWorking] = useState(false);

  const sentenceBoxRef = useRef(null);

  const displayItems = useMemo(() => {
    return (flatItems || []).map(item => {
      if (item.type === 'sentence') return { type: 'scene', data: item };
      if (item.type === 'image') return { type: 'illustration', data: item };
      return null;
    }).filter(Boolean);
  }, [flatItems]);

  const totalScenes = displayItems.length;
  const currentItem = displayItems[Math.min(itemIndex, Math.max(totalScenes - 1, 0))];
  const isText = currentItem?.type === 'scene';
  const isImage = currentItem?.type === 'illustration';
  const currentData = currentItem?.data;
  const cleanedTitle = cleanBookTitle(book.title);
  const adjacentTextScenes = useMemo(
    () => findAdjacentTextScenes(displayItems, itemIndex),
    [displayItems, itemIndex]
  );
  const jpAnalyzerShadow = useJpAnalyzerShadow(
    isText ? currentData?.plainText : '',
    {
      enabled: true,
      prefetchTexts: adjacentTextScenes.ordered.map(target => target.text)
    }
  );
  const jpAnalyzerLegacyAdapted = useMemo(() => {
    if (
      !isText ||
      !currentData?.plainText ||
      !jpAnalyzerShadow?.result
    ) {
      return { valid: false, errors: [], words: [], summary: null };
    }

    return adaptCompactAnalysisToReaderWords(
      jpAnalyzerShadow.result,
      currentData.plainText
    );
  }, [
    isText,
    currentData?.plainText,
    jpAnalyzerShadow?.result
  ]);

  const jpAnalyzerReader = useMemo(() => {
    if (
      !isText ||
      !currentData?.plainText ||
      !jpAnalyzerShadow?.result
    ) {
      return {
        valid: false,
        errors: [],
        words: [],
        schemaVersion: '',
        summary: null,
        correctionAware: false
      };
    }

    return adaptReaderSpansForRendering(
      jpAnalyzerShadow.result,
      currentData.plainText
    );
  }, [
    isText,
    currentData?.plainText,
    jpAnalyzerShadow?.result
  ]);

  const jpAnalyzerComparison = useMemo(() => {
    if (!isText || !jpAnalyzerLegacyAdapted.valid) return null;

    return compareReaderWordModels({
      text: currentData?.plainText ?? '',
      kuromojiWords:
        currentData?.classifiedWords ?? currentData?.tokens ?? [],
      analyzerWords: jpAnalyzerLegacyAdapted.words
    });
  }, [
    isText,
    currentData?.plainText,
    currentData?.classifiedWords,
    currentData?.tokens,
    jpAnalyzerLegacyAdapted
  ]);

  const jpAnalyzerPreviewAvailable =
    jpAnalyzerShadow?.status === 'ready' &&
    jpAnalyzerReader.valid === true &&
    jpAnalyzerReader.words.length > 0;

  const colourSourceResolution = resolveVisibleColourSource({
    requestedSource: colorSource,
    analyzerReady: jpAnalyzerPreviewAvailable,
    analyzerWords: jpAnalyzerReader.words,
    legacyWords:
      currentData?.displayWords || currentData?.contentWords || []
  });

  const activeDisplayWords = colourSourceResolution.words;
  const activeColorSource = colourSourceResolution.activeSource;
  const analyzerNeutralFallback =
    colourSourceResolution.neutralFallback;

  const legacyComprehension = useMemo(() => {
    if (!isText) return null;
    const words = currentData?.comprehensionWords || currentData?.contentWords || [];
    if (words.length === 0) return null;
    let known = 0;
    for (const w of words) {
      if (isTokenKnownForLearning(w)) known++;
    }
    return { known, total: words.length, percent: Math.round((known / words.length) * 100) };
  }, [currentData, isText, cacheVersion]);

  const legacyUnknownWords = useMemo(() => {
    if (!isText) return [];
    const sourceWords = currentData?.miningCandidates || currentData?.contentWords || [];
    const seen = new Set();
    const result = [];
    for (const w of sourceWords) {
      const form = w.dictionaryForm || w.surface;
      if (!form || isTokenKnownForLearning(w) || seen.has(form)) continue;
      seen.add(form);
      result.push({ word: form, surface: w.surface, freq: getFrequency(form) });
    }
    return result;
  }, [currentData, isText, cacheVersion, globalFreqReady]);

  const analyzerLearningModel = useMemo(() => {
    if (!isText || !jpAnalyzerReader.valid) return null;
    try {
      return buildAnalyzerLearningModel(jpAnalyzerReader.words, {
        isKnown: isKnownWord,
        getFrequency
      });
    } catch {
      return null;
    }
  }, [isText, jpAnalyzerReader, cacheVersion, globalFreqReady]);

  const learningOwnership = useMemo(() => resolveLearningOwnership({
    requestedSource: colorSource,
    analyzerValid: jpAnalyzerPreviewAvailable && Boolean(analyzerLearningModel),
    analyzerModel: analyzerLearningModel,
    legacyComprehension,
    legacyNewWords: legacyUnknownWords
  }), [
    colorSource,
    jpAnalyzerPreviewAvailable,
    analyzerLearningModel,
    legacyComprehension,
    legacyUnknownWords
  ]);

  const comprehension = learningOwnership.comprehension;
  const unknownWords = learningOwnership.newWords;

  const analyzerLearningShadow = useMemo(() => {
    if (!isText || !jpAnalyzerReader.valid) return null;
    return {
      analyzer: analyzerLearningModel,
      legacy: {
        comprehension: legacyComprehension,
        newWords: legacyUnknownWords,
        miningCandidateCount: (currentData?.miningCandidates || currentData?.contentWords || []).length
      },
      activeSource: learningOwnership.source,
      error: analyzerLearningModel ? null : 'Analyzer learning model is unavailable.'
    };
  }, [
    isText,
    jpAnalyzerReader,
    analyzerLearningModel,
    legacyComprehension,
    legacyUnknownWords,
    currentData,
    learningOwnership.source
  ]);

  const chapterStarts = useMemo(() => {
    const starts = new Map();
    displayItems.forEach((di, idx) => {
      const ci = di.type === 'scene' ? (di.data.chapterIndex ?? 0) : (di.data?.chapterIndex ?? 0);
      if (ci >= 0 && !starts.has(ci)) starts.set(ci, idx);
    });
    return starts;
  }, [displayItems]);

  const currentChapterIdx = isText ? (currentData?.chapterIndex ?? 0) : (isImage ? (currentData?.chapterIndex ?? 0) : 0);
  const currentChapterImages = chapterImageLists?.[currentChapterIdx] || [];

  useEffect(() => { if (itemIndex >= totalScenes) setItemIndex(Math.max(0, totalScenes - 1)); }, [totalScenes, itemIndex]);
  useEffect(() => {
    saveProgress(book.id, {
      itemIndex,
      showFurigana,
      verticalMode,
      readerStyle,
      sidebarOpen,
      noteType,
      fields,
      debugMode,
      colorSource
    });
  }, [
    book.id,
    itemIndex,
    showFurigana,
    verticalMode,
    readerStyle,
    sidebarOpen,
    noteType,
    fields,
    debugMode,
    colorSource
  ]);
  useEffect(() => {
    function key(event) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); setItemIndex(i => Math.min(totalScenes - 1, i + 1)); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); setItemIndex(i => Math.max(0, i - 1)); }
      else if (event.key.toLowerCase() === 'f') setShowFurigana(v => !v);
      else if (event.key.toLowerCase() === 'v') setVerticalMode(v => !v);
      else if (event.key.toLowerCase() === 's') setSidebarOpen(v => !v);
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [totalScenes]);

  useEffect(() => {
    checkAnkiStatus();
    loadData();
  }, []);

  useEffect(() => {
    setSelectedText('');
    setSelectedReaderContext(null);
    setSelectionIssue('');
  }, [itemIndex]);

  async function checkAnkiStatus() {
    try { await checkAnkiConnect(); setAnkiStatus({ connected: true, message: 'Connected' }); }
    catch { setAnkiStatus({ connected: false, message: 'Not connected' }); }
  }

  async function loadData() {
    try {
      if (getCacheSize() === 0) await buildCache(ankiRequest);
      startLoadingGlobalFrequency().then(() => setGlobalFreqReady(true));
    } catch (e) { console.error('[Reader] Data load error:', e); }
    setCacheVersion(v => v + 1);
  }

  function handleTextSelection() {
    setTimeout(() => {
      const rawSelectedText = getSelectedWord();
      if (!rawSelectedText) return;
      setSelectedText(rawSelectedText);
      setSelectedReaderContext(null);
      setSelectionIssue('');
      if (learningOwnership.source !== 'jp-analyzer') return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount || !sentenceBoxRef.current) {
        setSelectionIssue('Analyzer structure is unavailable for this selection.');
        return;
      }
      const range = selection.getRangeAt(0);
      const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
      const endElement = range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer : range.endContainer.parentElement;
      const startSpan = startElement?.closest?.('[data-analyzer-start][data-analyzer-end]');
      const endSpan = endElement?.closest?.('[data-analyzer-start][data-analyzer-end]');
      if (!startSpan || !endSpan || !sentenceBoxRef.current.contains(startSpan) || !sentenceBoxRef.current.contains(endSpan)) {
        setSelectionIssue('Analyzer structure is unavailable for this selection.');
        return;
      }
      const spanStart = Number(startSpan.dataset.analyzerStart);
      const spanEnd = Number(startSpan.dataset.analyzerEnd);
      const endSpanStart = Number(endSpan.dataset.analyzerStart);
      const endSpanEnd = Number(endSpan.dataset.analyzerEnd);
      if (spanStart !== endSpanStart || spanEnd !== endSpanEnd) {
        setSelectionIssue('The selection crosses multiple analyzer spans.');
        return;
      }
      const resolution = resolveAnalyzerReaderContextForOffsets(
        jpAnalyzerReader.words,
        spanStart,
        spanEnd,
        rawSelectedText
      );
      if (!resolution.valid) {
        setSelectionIssue('Select within one analyzer span.');
        return;
      }
      setSelectedReaderContext(resolution.context);
      setSelectedText(resolution.context.surface);
    }, 10);
  }

  function selectNewWord(newWord) {
    const span = newWord.analyzerSpan;
    if (learningOwnership.source === 'jp-analyzer' && span) {
      const context = createAnalyzerReaderContext(span, span.start, span.end, newWord.surface || newWord.word);
      setSelectedReaderContext(context);
      setSelectedText(context.surface);
      setSelectionIssue('');
      return;
    }
    setSelectedReaderContext(null);
    setSelectionIssue('');
    setSelectedText(newWord.word);
  }

  function getKnownKeyCandidates(word) {
    if (learningOwnership.source === 'jp-analyzer') {
      const key = String(selectedReaderContext?.knownLookupKey || '').trim();
      return key ? [key] : [];
    }
    const target = String(word || '').trim();
    if (!target) return [];
    const candidates = new Set();
    const tokenSources = [
      ...(currentData?.miningCandidates || []),
      ...(currentData?.displayWords || []),
      ...(currentData?.contentWords || []),
      ...(currentData?.classifiedWords || []),
      ...(currentData?.tokens || [])
    ];
    for (const token of tokenSources) {
      const surface = String(token?.surface || '').trim();
      const dictionaryForm = String(token?.dictionaryForm || surface || '').trim();
      if (surface === target || dictionaryForm === target) {
        if (dictionaryForm) candidates.add(dictionaryForm);
        if (surface) candidates.add(surface);
      }
    }
    candidates.add(target);
    return [...candidates];
  }

  function getPrimaryKnownKey(word) {
    return getKnownKeyCandidates(word)[0] || String(word || '').trim();
  }

  function isManualKnownCandidate(word) {
    return getKnownKeyCandidates(word).some(candidate => isManualKnownWord(candidate));
  }

  function isKnownCandidate(word) {
    return getKnownKeyCandidates(word).some(candidate => isKnownWord(candidate));
  }

  function getSelectedLearningTokens(word) {
    const target = String(word || '').trim();
    if (!target) return [];
    const tokenSources = [
      ...(currentData?.classifiedWords || []),
      ...(currentData?.displayWords || []),
      ...(currentData?.miningCandidates || []),
      ...(currentData?.tokens || [])
    ];
    return tokenSources.filter(token => {
      const surface = String(token?.surface || '').trim();
      const dictionaryForm = String(token?.dictionaryForm || surface || '').trim();
      if (surface !== target && dictionaryForm !== target) return false;
      return token?.tokenCategory === 'learning' || token?.countsForComprehension === true || token?.showInNewWords === true;
    });
  }

  function isLearningCandidate(word) {
    if (learningOwnership.source === 'jp-analyzer') {
      return Boolean(selectedReaderContext?.knownLookupKey);
    }
    return getSelectedLearningTokens(word).length > 0;
  }

  function getAnalyzerActionState() {
    return getAnalyzerSelectionActionState(selectedReaderContext, {
      isKnown: isKnownWord,
      isManualKnown: isManualKnownWord
    });
  }

  function handleMarkKnown(word) {
    const target = String(word || '').trim();
    if (!target) return;
    const primary = learningOwnership.source === 'jp-analyzer'
      ? String(selectedReaderContext?.knownLookupKey || '').trim()
      : getPrimaryKnownKey(target);
    if (!primary) {
      setStatus({ type: 'error', message: 'This analyzer span has no vocabulary known-word identity.' });
      return;
    }
    addManualKnownWord(primary);
    setSelectedText(primary);
    setCacheVersion(v => v + 1);
    setStatus({ type: 'ok', message: `Marked ${primary} as known.` });
  }

  function handleUndoKnown(word) {
    const target = String(word || '').trim();
    if (!target) return;
    const candidates = getKnownKeyCandidates(target);
    const removed = candidates.filter(candidate => removeManualKnownWord(candidate));
    setSelectedText(target);
    setCacheVersion(v => v + 1);
    if (removed.length > 0) {
      setStatus({ type: 'ok', message: `Removed manual-known status for ${removed.join(', ')}.` });
    } else {
      setStatus({ type: 'error', message: `${target} was not found in manual known words. It may be known from Anki.` });
    }
  }
  function updateStyle(patch) { setReaderStyle(s => ({ ...s, ...patch })); }
  function stepStyle(key, delta, min, max) { setReaderStyle(s => ({ ...s, [key]: clamp(Number(s[key]) + delta, min, max) })); }
  function resetStyle() { setReaderStyle(DEFAULT_STYLE); setVerticalMode(true); }
  function jumpToChapter(idx) { const start = chapterStarts.get(Number(idx)); if (start !== undefined) setItemIndex(start); }
  function handleSaveSessionToken(value) { setSessionToken(value); try { localStorage.setItem('nadeshiko_session_token', value); } catch {} }
  function toggleForceTts() { const next = !forceTts; setForceTts(next); try { localStorage.setItem('force_tts', String(next)); } catch {} }

  function jumpToImage(dataUri) {
    const idx = displayItems.findIndex(di => di.type === 'illustration' && di.data?.dataUri === dataUri);
    if (idx >= 0) { setItemIndex(idx); setUnblurredImages(prev => { const next = new Set(prev); next.add(dataUri); return next; }); setSidebarOpen(false); }
  }
  function toggleImageBlur(dataUri) {
    setUnblurredImages(prev => { const next = new Set(prev); if (next.has(dataUri)) next.delete(dataUri); else next.add(dataUri); return next; });
  }
  function handleGo() {
    const num = parseInt(goInput, 10);
    if (num >= 1 && num <= totalScenes) { setItemIndex(num - 1); setGoInput(''); }
  }

  function handleExportDebugReport() {
    const report = buildDebugReport({ book, itemIndex, totalScenes, currentData, currentDisplayItem, selectedText, comprehension, unknownWords, debugTokenRows, debugSceneRows, debugNearbyRows, parserDebugRows, chapterDebugRows, miningDebug, ankiStatus, globalFreqReady, forceTts, readerStyle, showFurigana, verticalMode });
    const safeTitle = cleanBookTitle(book?.title || book?.fileName || 'book').replace(/[\/:*?"<>|\s]+/g, '_').slice(0, 60) || 'book';
    downloadJsonFile(`novel-audio-miner-debug-${safeTitle}-scene-${itemIndex + 1}.json`, report);
  }

  function updateMiningDebug(patch) {
    setMiningDebug(prev => ({ ...(prev || {}), ...patch, updatedAt: new Date().toISOString() }));
  }

  async function handleMine() {
    if (!selectedText) { setMiningDebug({ status: 'blocked', stage: 'validation', selectedWord: '', error: 'Select a word first.', updatedAt: new Date().toISOString() }); setStatus({ type: 'error', message: 'Select a word first.' }); return; }
    if (!isText) { setMiningDebug({ status: 'blocked', stage: 'validation', selectedWord: selectedText, error: 'Navigate to text first.', updatedAt: new Date().toISOString() }); setStatus({ type: 'error', message: 'Navigate to text first.' }); return; }
    const novelSentence = currentData?.plainText || '';
    const analyzerCandidate = learningOwnership.source === 'jp-analyzer'
      ? selectedReaderContext
      : null;
    if (learningOwnership.source === 'jp-analyzer' && (!analyzerCandidate || analyzerCandidate.eligibleForMining !== true)) {
      const message = selectionIssue || getAnalyzerActionState().miningMessage;
      setMiningDebug({ status: 'blocked', stage: 'eligibility', selectedWord: selectedText, error: message, updatedAt: new Date().toISOString() });
      setStatus({ type: 'error', message });
      return;
    }
    const miningLookupKey = analyzerCandidate ? getAnalyzerMiningLookupKey(analyzerCandidate) : selectedText;
    setMiningDebug({ status: 'running', stage: 'start', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), selectedWord: selectedText, miningLookupKey, analyzerMiningSelection: selectedReaderContext, learningSource: learningOwnership.source, noteType, scene: `${itemIndex + 1} / ${totalScenes}`, chapterTitle: currentData?.chapterTitle || '', novelSentence });
    setIsWorking(true); setEnrichResult(null); setStatus({ type: 'working', message: 'Connecting to Anki...' });
    try {
      updateMiningDebug({ status: 'running', stage: 'checkAnkiConnect' }); await checkAnkiConnect();
      setStatus({ type: 'working', message: 'Finding latest note...' }); updateMiningDebug({ status: 'running', stage: 'findLatestNote' });
      const noteResult = await findLatestNote(noteType);
      updateMiningDebug({ latestNoteQuery: noteResult.query, latestNoteCount: noteResult.ids?.length ?? 0, latestNoteId: noteResult.note?.noteId || '' });
      if (!noteResult.note) { updateMiningDebug({ status: 'error', stage: 'findLatestNote', error: 'No Kiku note found.' }); setStatus({ type: 'error', message: 'No Kiku note found.' }); setIsWorking(false); return; }
      const noteId = noteResult.note.noteId;
      updateMiningDebug({ status: 'running', stage: 'enrichment' });
      const result = await autoEnrichWordWithFallback(miningLookupKey, novelSentence, ankiRequest, noteType, msg => { updateMiningDebug({ status: 'running', stage: msg }); setStatus({ type: 'working', message: msg }); });
      setEnrichResult(result);
      updateMiningDebug({ status: 'running', stage: 'enrichmentComplete', enrichmentMethod: result.method || '', source: result.source || '', mode: result.mode || '', unknownCount: result.unknownCount ?? null, chosenSentence: result.sentence || '', sentenceFurigana: result.sentenceFurigana || '', hasAudioUrl: Boolean(result.audioUrl), hasImageUrl: Boolean(result.imageUrl), audioUrl: result.audioUrl || '', imageUrl: result.imageUrl || '' });
      setStatus({ type: 'working', message: 'Downloading media...' });
      const fieldUpdates = { [fields.sentence]: result.sentence, [fields.sentenceFurigana]: result.sentenceFurigana || result.sentence, [fields.miscInfo]: [cleanedTitle, currentData?.chapterTitle || ''].filter(Boolean).join(' · ') };
      if (result.method !== 'voicevox') fieldUpdates[fields.selectionText] = novelSentence;
      if (result.method === 'voicevox') { try { updateMiningDebug({ status: 'running', stage: 'voicevoxAudio' }); const { audioBase64, filename } = await generateVoicevoxAudio(novelSentence); await ankiRequest('storeMediaFile', { filename, data: audioBase64 }); fieldUpdates[fields.sentenceAudio] = `[sound:${filename}]`; updateMiningDebug({ sentenceAudio: `[sound:${filename}]` }); } catch (err) { updateMiningDebug({ voicevoxError: err?.message || String(err) }); } }
      else if (result.audioUrl) { try { updateMiningDebug({ status: 'running', stage: 'nadeshikoAudio' }); const filename = `nade_audio_${Date.now()}.mp3`; await ankiRequest('storeMediaFile', { filename, url: result.audioUrl }); fieldUpdates[fields.sentenceAudio] = `[sound:${filename}]`; updateMiningDebug({ sentenceAudio: `[sound:${filename}]` }); } catch (e) { updateMiningDebug({ audioError: e?.message || String(e) }); } }
      if (result.method !== 'voicevox' && result.imageUrl) { try { updateMiningDebug({ status: 'running', stage: 'nadeshikoImage' }); const filename = `nade_img_${Date.now()}.jpg`; await ankiRequest('storeMediaFile', { filename, url: result.imageUrl }); fieldUpdates[fields.picture] = `<img src="${filename}">`; updateMiningDebug({ picture: `<img src="${filename}">` }); } catch (e) { updateMiningDebug({ imageError: e?.message || String(e) }); } }
      updateMiningDebug({ status: 'running', stage: 'updateNoteFields', preparedFields: fieldUpdates }); await updateNoteFields(noteId, fieldUpdates);
      if (learningOwnership.source === 'legacy-kuromoji' || analyzerCandidate?.knownLookupKey) addKnownWord(miningLookupKey); setCacheVersion(v => v + 1); try { await ankiRequest('guiBrowse', { query: `nid:${noteId}` }); } catch (e) {}
      updateMiningDebug({ status: 'completed', stage: 'done', updatedNoteId: noteId, preparedFields: fieldUpdates }); setStatus({ type: 'ok', message: `Card updated — ${result.source}${result.mode ? ` (${result.mode})` : ''}` });
    } catch (err) { updateMiningDebug({ status: 'error', stage: 'failed', error: err?.message || String(err) }); setStatus({ type: 'error', message: err?.message || String(err) }); }
    setIsWorking(false);
  }

  const boxStyle = {
    fontSize: `${readerStyle.fontSize}px`, lineHeight: readerStyle.lineHeight,
    height: verticalMode ? `${readerStyle.height}px` : undefined,
    fontFamily: FONT_STACKS[readerStyle.fontFamily] || FONT_STACKS.mincho
  };
  if (!totalScenes) return <section className="reader-card"><h2>{cleanedTitle}</h2><p>No content found.</p></section>;

  const hasDialogueColumns = Boolean(verticalMode && !showFurigana && isText && currentData?.plainText?.includes('\n'));
  const currentDisplayItem = displayItems[itemIndex] || null;
  const debugTokenRows = useMemo(() => getDebugTokenRows(currentData), [currentData, cacheVersion, globalFreqReady]);
  const debugSceneRows = useMemo(() => getSceneDebugSummary({ currentData, displayItem: currentDisplayItem, itemIndex, totalScenes, isText, isImage, selectedText, unknownWords, comprehension, currentChapterImages }), [currentData, currentDisplayItem, itemIndex, totalScenes, isText, isImage, selectedText, unknownWords, comprehension, currentChapterImages]);
  const debugNearbyRows = useMemo(() => getNearbySceneRows(displayItems, itemIndex), [displayItems, itemIndex]);
  const miningDebugRows = useMemo(() => getMiningDebugRows(miningDebug), [miningDebug]);
  const parserDebugRows = useMemo(() => getParserDebugRows(currentData, currentDisplayItem, book), [currentData, currentDisplayItem, book]);
  const chapterDebugRows = useMemo(() => getChapterDebugRows(book, chapterImageLists), [book, chapterImageLists]);
  const selectedDebugToken = useMemo(() => {
    if (!selectedText) return null;
    return debugTokenRows.find(row => row.surface === selectedText || row.dictionaryForm === selectedText) || null;
  }, [debugTokenRows, selectedText]);
  const debugTokenSummary = useMemo(() => {
    const summary = { learning: 0, knownLearning: 0, unknownLearning: 0, grammar: 0, names: 0, numeric: 0 };
    for (const row of debugTokenRows) {
      if (row.tokenCategory === 'learning') {
        summary.learning += 1;
        if (row.known) summary.knownLearning += 1;
        else summary.unknownLearning += 1;
      } else if (row.tokenCategory === 'proper-noun') summary.names += 1;
      else if (row.tokenCategory === 'numeric') summary.numeric += 1;
      else summary.grammar += 1;
    }
    return summary;
  }, [debugTokenRows]);
  const parserSummaryRows = useMemo(() => parserDebugRows.filter(([label]) => ['pageHref', 'orderedIndex', 'itemType', 'chapterIndex', 'chapterTitle', 'imageSrc', 'resolvedZipPath', 'imageExists', 'dataUri'].includes(label)), [parserDebugRows]);
  const miningSummaryRows = useMemo(() => miningDebugRows.filter(([label]) => ['status', 'stage', 'selectedWord', 'latestNoteId', 'enrichmentMethod', 'source', 'mode', 'sentenceAudio', 'picture', 'error'].includes(label)), [miningDebugRows]);

  return (
    <>
      <div className="status-bar">
        <div className="status-left">
          <span className={`status-dot ${ankiStatus.connected ? 'ok' : 'error'}`} />
          <span>Anki {ankiStatus.connected ? 'Connected' : 'Offline'}</span>
          {comprehension && (
            <>
              <span>·</span>
              <span>Comprehension: <strong>{comprehension.percent}%</strong> ({comprehension.known}/{comprehension.total})</span>
            </>
          )}
          {isText && !learningOwnership.available && (
            <>
              <span>·</span>
              <span>Analyzer learning model unavailable</span>
            </>
          )}
        </div>
        <div className="status-right">
          <span>{getCacheSize()} known</span>
          <span>·</span>
          <span>{!globalFreqReady ? 'Freq loading...' : forceTts ? 'VOICEVOX' : 'Nadeshiko'}</span>
          <span>·</span>
          <span>{cleanedTitle}</span>
        </div>
      </div>

      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <h1>{cleanedTitle}</h1>
          <span className="version">v4.1</span>
        </div>
        <button className="secondary" onClick={onLoadAnotherBook}>Load another book</button>
      </div>

      <div className="main-layout">
        <div className="sidebar-toggle" onClick={() => setSidebarOpen(v => !v)} title="Toggle sidebar (S)">{sidebarOpen ? '✕' : '☰'}</div>

        <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <h2>{cleanedTitle}</h2>
          <p className="book-author">{book.author || 'Unknown author'}</p>
          <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--muted)' }}>
            <span><strong>{book.chapters.length}</strong> chapters</span>
            <span><strong>{totalScenes}</strong> scenes</span>
          </div>
          <div>
            <label className="section-label">Jump to chapter</label>
            <select className="chapter-select" value={currentChapterIdx} onChange={e => jumpToChapter(e.target.value)}>
              {book.chapters.map((c, i) => <option key={c.id} value={i}>{i + 1}. {c.title || `Chapter ${i + 1}`}</option>)}
            </select>
          </div>
          {unknownWords.length > 0 && (
            <div>
              <label className="section-label">New words ({unknownWords.length})</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {unknownWords.map((uw, idx) => {
                  const display = uw.surface || uw.word;
                  return (
                    <span key={idx} className="word-badge-pair">
                      <button
                        type="button"
                        className={`word-badge ${uw.freq?.category ? `word-freq-${uw.freq.category}` : 'word-freq-unlisted'}`}
                        title={`${uw.freq ? `Rank ${uw.freq.rank} · ${uw.freq.category}` : 'Unlisted'} · Click to select`}
                        onClick={() => selectNewWord(uw)}>
                        {display}
                      </button>
                      <button
                        type="button"
                        className="mark-known-mini"
                        title={`Mark ${display} as known`}
                        onClick={() => handleMarkKnown(uw.word)}>
                        ✓
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {currentChapterImages.length > 0 && (
            <div>
              <label className="section-label">Illustrations ({currentChapterImages.length})</label>
              <div className="image-thumbs">
                {currentChapterImages.map((img, idx) => {
                  const displayIdx = displayItems.findIndex(di => di.type === 'illustration' && di.data?.dataUri === img.dataUri);
                  return (
                    <div key={idx} className="image-thumb" onClick={() => jumpToImage(img.dataUri)} title={img.alt || ''}>
                      <img src={img.dataUri} alt={img.alt || ''} />
                      {displayIdx >= 0 && <span className="thumb-label">Scene {displayIdx + 1}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="secondary" onClick={() => setShowFurigana(v => !v)} style={{ flex: 1, fontSize: '12px' }}>Furigana: {showFurigana ? 'ON' : 'OFF'}</button>
            <button className="secondary" onClick={() => setVerticalMode(v => !v)} style={{ flex: 1, fontSize: '12px' }}>{verticalMode ? 'Vertical' : 'Horizontal'}</button>
          </div>
          <details open={showStyle} onToggle={e => setShowStyle(e.target.open)}>
            <summary style={{ fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>Reader style</summary>
            <div className="style-panel">
              <div className="style-row"><span>Font size</span><div><button onClick={() => stepStyle('fontSize', -2, 20, 46)}>−</button><b>{readerStyle.fontSize}</b><button onClick={() => stepStyle('fontSize', 2, 20, 46)}>+</button></div></div>
              <input type="range" min="20" max="46" value={readerStyle.fontSize} onChange={e => updateStyle({ fontSize: Number(e.target.value) })} />
              <div className="style-row"><span>Line spacing</span><div><button onClick={() => stepStyle('lineHeight', -0.1, 1.4, 2.8)}>−</button><b>{readerStyle.lineHeight.toFixed(2)}</b><button onClick={() => stepStyle('lineHeight', 0.1, 1.4, 2.8)}>+</button></div></div>
              <input type="range" min="1.4" max="2.8" step="0.05" value={readerStyle.lineHeight} onChange={e => updateStyle({ lineHeight: Number(e.target.value) })} />
              <div className="style-row"><span>Height</span><div><button onClick={() => stepStyle('height', -40, 420, 900)}>−</button><b>{readerStyle.height}</b><button onClick={() => stepStyle('height', 40, 420, 900)}>+</button></div></div>
              <input type="range" min="420" max="900" step="20" value={readerStyle.height} onChange={e => updateStyle({ height: Number(e.target.value) })} />
              <button className="secondary" onClick={resetStyle} style={{ marginTop: '8px', width: '100%', fontSize: '11px' }}>Reset to default</button>
            </div>
          </details>
          <details className="advanced-settings">
            <summary>Advanced</summary>
            <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
              <label style={{ fontSize: '11px', color: 'var(--muted)' }}>Note type: <input value={noteType} onChange={e => setNoteType(e.target.value)} /></label>
              <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'grid', gap: '4px' }}>
                Colour source:
                <select
                  value={colorSource}
                  onChange={event => setColorSource(
                    normalizeColorSource(event.target.value)
                  )}
                >
                  <option value={COLOR_SOURCES.JP_ANALYZER}>JP Analyzer</option>
                  <option value={COLOR_SOURCES.LEGACY_KUROMOJI}>Legacy Kuromoji</option>
                  <option value={COLOR_SOURCES.PLAIN_TEXT}>Plain text</option>
                </select>
                <span style={{ fontSize: '10px' }}>
                  JP Analyzer is the primary colour source. Legacy Kuromoji remains available for rollback. Invalid analyzer output is shown as neutral text.
                </span>
              </label>
              <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'grid', gap: '4px' }}>Session Token: <input value={sessionToken} onChange={e => handleSaveSessionToken(e.target.value)} placeholder="Paste __Secure-nadeshiko.session_token" /><span style={{ fontSize: '10px' }}>F12 → Application → Cookies → nadeshiko.co</span></label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button className="secondary" onClick={async () => { try { await buildCache(ankiRequest); setCacheVersion(v => v + 1); } catch {} }} style={{ fontSize: '10px', padding: '4px 8px' }}>Rebuild Cache</button>
                <button className="secondary" onClick={() => { clearCache(); setCacheVersion(v => v + 1); }} style={{ fontSize: '10px', padding: '4px 8px' }}>Clear Anki Cache</button>
                <button className="secondary" onClick={toggleForceTts} style={{ fontSize: '10px', padding: '4px 8px', background: forceTts ? 'var(--warning)' : undefined }}>Force TTS: {forceTts ? 'ON' : 'OFF'}</button>
                <button className="secondary" onClick={() => setDebugMode(v => !v)} style={{ fontSize: '10px', padding: '4px 8px', background: debugMode ? 'var(--accent)' : undefined }}>Debug Mode: {debugMode ? 'ON' : 'OFF'}</button>
              </div>
            </div>
          </details>

          {debugMode && (
            <div className="debug-panel">
              <div className="debug-panel-title-row">
                <div className="debug-panel-title">Debug Mode v6</div>
                <button type="button" className="debug-export-btn" onClick={handleExportDebugReport}>Export full report</button>
              </div>

              <details open>
                <summary>Current scene</summary>
                <div className="debug-summary-grid">
                  <div className="debug-mini-card"><span>Scene</span><strong>{itemIndex + 1} / {totalScenes}</strong></div>
                  <div className="debug-mini-card"><span>Type</span><strong>{isImage ? 'image' : 'sentence'}</strong></div>
                  <div className="debug-mini-card"><span>Chapter</span><strong>{currentData?.chapterTitle || '-'}</strong></div>
                  <div className="debug-mini-card"><span>Selected</span><strong>{selectedText || '-'}</strong></div>
                  <div className="debug-mini-card"><span>Comprehension</span><strong>{comprehension ? `${comprehension.percent}% (${comprehension.known}/${comprehension.total})` : 'n/a'}</strong></div>
                  <div className="debug-mini-card"><span>Unknown</span><strong>{unknownWords.length}</strong></div>
                </div>
              </details>
<details className="debug-nested" open>
  <summary>Primary colour source — Phase 3C</summary>
  <div className="debug-empty">
    JP Analyzer and Plain Text modes use authoritative analyzer comprehension
    and New Words. Legacy Kuromoji mode retains the legacy learning model.
    Mining uses exact analyzer-owned span offsets in JP Analyzer and Plain Text modes.
  </div>
  <div className="debug-summary-grid">
    <div className="debug-mini-card"><span>Requested source</span><strong>{colorSource}</strong></div>
    <div className="debug-mini-card"><span>Preference origin</span><strong>{hasSavedColorSource ? 'saved' : 'default'}</strong></div>
    <div className="debug-mini-card"><span>Active source</span><strong>{activeColorSource}</strong></div>
    <div className="debug-mini-card"><span>Analyzer state</span><strong>{jpAnalyzerShadow?.status ?? 'idle'}</strong></div>
    <div className="debug-mini-card"><span>Analyzer available</span><strong>{String(jpAnalyzerPreviewAvailable)}</strong></div>
    <div className="debug-mini-card"><span>Neutral fallback</span><strong>{String(analyzerNeutralFallback)}</strong></div>
  </div>
  {analyzerNeutralFallback && (
    <div className="debug-empty">
      JP Analyzer was selected, but readerSpans are unavailable or invalid. Neutral text is shown; Kuromoji was not selected automatically.
    </div>
  )}
</details>

<JpAnalyzerIntegrationPanel
  currentData={currentData}
  shadowState={jpAnalyzerShadow}
  adaptedResult={jpAnalyzerReader}
  comparison={jpAnalyzerComparison}
  learningShadow={analyzerLearningShadow}
  onClearShadowCache={
    clearJpAnalyzerShadowCache
  }
/>

<DictionaryDebugPanel
  selectedText={selectedText}
  currentData={currentData}
/>
              <details>
                <summary>Token summary</summary>
                <div className="debug-summary-grid">
                  <div className="debug-mini-card"><span>Total tokens</span><strong>{debugTokenRows.length}</strong></div>
                  <div className="debug-mini-card"><span>Learning</span><strong>{debugTokenSummary.learning}</strong></div>
                  <div className="debug-mini-card"><span>Known learning</span><strong>{debugTokenSummary.knownLearning}</strong></div>
                  <div className="debug-mini-card"><span>Unknown learning</span><strong>{debugTokenSummary.unknownLearning}</strong></div>
                  <div className="debug-mini-card"><span>Grammar/other</span><strong>{debugTokenSummary.grammar}</strong></div>
                  <div className="debug-mini-card"><span>Name/numeric</span><strong>{debugTokenSummary.names} / {debugTokenSummary.numeric}</strong></div>
                </div>
                {selectedDebugToken ? (
                  <details className="debug-nested" open>
                    <summary>selected token</summary>
                    <div className="debug-kv-list">
                      <div className="debug-kv"><span>surface</span><code>{selectedDebugToken.surface || '-'}</code></div>
                      <div className="debug-kv"><span>dictionary</span><code>{selectedDebugToken.dictionaryForm || '-'}</code></div>
                      <div className="debug-kv"><span>POS</span><code>{[selectedDebugToken.pos, selectedDebugToken.posDetail1, selectedDebugToken.posDetail2].filter(Boolean).join(' / ') || '-'}</code></div>
                      <div className="debug-kv"><span>category</span><code>{selectedDebugToken.tokenCategory || '-'}</code></div>
                      <div className="debug-kv"><span>known</span><code>{yesNo(selectedDebugToken.known)}</code></div>
                      <div className="debug-kv"><span>manual</span><code>{yesNo(selectedDebugToken.manualKnown)}</code></div>
                      <div className="debug-kv"><span>color</span><code>{selectedDebugToken.colorClass || '-'}</code></div>
                      <div className="debug-kv"><span>frequency</span><code>{selectedDebugToken.frequency || '-'}</code></div>
                    </div>
                  </details>
                ) : selectedText ? (<div className="debug-empty">Selected text was not mapped to a token. Use Export full report for raw token rows.</div>) : (<div className="debug-empty">Select a word to inspect token details.</div>)}
              </details>

              <details>
                <summary>Parser / image summary</summary>
                <div className="debug-kv-list">{parserSummaryRows.map(([label, value]) => (<div className="debug-kv" key={label}><span>{label}</span><code>{value || '-'}</code></div>))}</div>
              </details>

              <details>
                <summary>Mining summary</summary>
                {!miningDebug ? (<div className="debug-empty">No mining attempt recorded yet.</div>) : (<div className="debug-kv-list">{miningSummaryRows.map(([label, value]) => (<div className="debug-kv" key={label}><span>{label}</span><code>{value || '-'}</code></div>))}</div>)}
              </details>

              <details>
                <summary>Nearby scenes ({debugNearbyRows.length})</summary>
                <div className="debug-neighbor-list">
                  {debugNearbyRows.map(row => (<div className={`debug-neighbor-row ${row.relative === 'current' ? 'current' : ''}`} key={row.index}><div><strong>{row.relative}</strong><span>Scene {row.index + 1}</span><span>{row.type}</span></div><code>{row.preview || '-'}</code></div>))}
                </div>
              </details>

              <details>
                <summary>Raw details are in export</summary>
                <div className="debug-empty">Use Export full report for full token rows, parser rows, text/html, mining fields, dictionary diagnostics, and raw debug data.</div>
              </details>
            </div>
          )}
        </aside>

        <div className="reader-area">
          <div className="nav-header">
            <span className="chapter-info">
              {currentData?.chapterTitle || ''}
              <span style={{ color: 'var(--muted)', marginLeft: '8px' }}>Ch. {currentChapterIdx + 1}/{book.chapters.length}</span>
            </span>
            <div className="nav-controls">
              <button onClick={() => setItemIndex(i => Math.max(0, i - 1))} disabled={itemIndex === 0}>←</button>
              <input type="number" min="1" max={totalScenes} value={goInput} onChange={e => setGoInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleGo(); }} placeholder={`1-${totalScenes}`} />
              <button onClick={handleGo}>Go</button>
              <button onClick={() => setItemIndex(i => Math.min(totalScenes - 1, i + 1))} disabled={itemIndex === totalScenes - 1}>→</button>
            </div>
            <span className="item-counter">{isText ? '📖' : '🖼️'} Scene {itemIndex + 1}/{totalScenes}</span>
          </div>

          {isText && currentData && (
            <>
              <div ref={sentenceBoxRef}
                className={`sentence-box ${verticalMode ? 'vertical' : ''} ${hasDialogueColumns ? 'dialogue-columns' : ''}`}
                lang="ja" style={boxStyle}
                onMouseUp={handleTextSelection} onDoubleClick={handleTextSelection} onTouchEnd={handleTextSelection}>
                {renderStableSentence({
                  htmlText: currentData.htmlText,
                  plainText: currentData.plainText,
                  tokens: activeDisplayWords,
                  showFurigana,
                  verticalMode
                })}
              </div>
              {status.message && <div className={`status-message ${status.type}`} style={{ marginTop: '8px' }}>{status.message}</div>}
            </>
          )}

          {isImage && currentData && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="image-panel" onClick={() => toggleImageBlur(currentData.dataUri)}>
                <img src={currentData.dataUri} alt={currentData.alt || ''} className={!unblurredImages.has(currentData.dataUri) ? 'blurred' : ''} />
                {!unblurredImages.has(currentData.dataUri) && <div className="unblur-btn">Click to reveal</div>}
              </div>
              {currentData.alt && unblurredImages.has(currentData.dataUri) && <div className="image-caption">{currentData.alt}</div>}
              {status.message && <div className={`status-message ${status.type}`} style={{ marginTop: '8px' }}>{status.message}</div>}
            </div>
          )}

          {isText && (
            <div className="action-bar">
              <div className="selected-word">
                <span className="label">Selected:</span>
                <span className="word" title={selectedText}>{selectedText || '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isWorking && <span className="mine-status">Working...</span>}
                {enrichResult && !isWorking && <span className="mine-status" style={{ color: 'var(--success)' }}>✓ {enrichResult.source}</span>}
                {learningOwnership.source === 'jp-analyzer' ? (() => {
                  const action = getAnalyzerActionState();
                  if (!selectedText) return <button className="secondary mark-known-btn" disabled>Mark as Known</button>;
                  if (action.canUndoKnown) return <button className="secondary mark-known-btn" onClick={() => handleUndoKnown(selectedText)} disabled={isWorking}>Undo Known</button>;
                  if (action.knownFromAnki) return <button className="secondary mark-known-btn known-from-anki-btn" disabled title="This analyzer lookup key is already known from Anki/cache.">Known from Anki</button>;
                  if (action.canMarkKnown) return <button className="secondary mark-known-btn" onClick={() => handleMarkKnown(selectedText)} disabled={isWorking}>Mark as Known</button>;
                  return <button className="secondary mark-known-btn non-learning-word-btn" disabled title={selectionIssue || action.knownMessage}>{action.knownMessage || 'Not vocabulary-known eligible'}</button>;
                })() : selectedText && isManualKnownCandidate(selectedText) ? (
                  <button className="secondary mark-known-btn" onClick={() => handleUndoKnown(selectedText)} disabled={isWorking}>Undo Known</button>
                ) : selectedText && isKnownCandidate(selectedText) ? (
                  <button className="secondary mark-known-btn known-from-anki-btn" disabled title="This word is already known from Anki/cache. It is not in manual-known storage.">Known from Anki</button>
                ) : selectedText && !isLearningCandidate(selectedText) ? (
                  <button className="secondary mark-known-btn non-learning-word-btn" disabled title="Legacy Kuromoji does not classify this selection as a learning word.">Not a learning word</button>
                ) : (
                  <button className="secondary mark-known-btn" onClick={() => handleMarkKnown(selectedText)} disabled={!selectedText || isWorking}>Mark as Known</button>
                )}
                <button className="mine-btn" onClick={handleMine} disabled={!selectedText || isWorking || (learningOwnership.source === 'jp-analyzer' && (!selectedReaderContext || selectedReaderContext.eligibleForMining !== true))}>⚡ Mine to Anki</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
