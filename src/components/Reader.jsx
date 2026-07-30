import { useEffect, useMemo, useState, useRef } from 'react';
import DictionaryManagementPanel from './DictionaryManagementPanel.jsx';
import TeachingPanel from './TeachingPanel.jsx';
import { resolveTeachingSelection, teachingSelectionMessage } from '../lib/teachingSelectionResolver.js';
import { getProgress, saveProgress } from '../lib/storage.js';
import { checkAnkiConnect, findLatestNote, updateNoteFields, ankiRequest } from '../lib/ankiConnect.js';
import { autoEnrichWordWithFallback, generateVoicevoxAudio } from '../lib/enrichService.js';
import { buildCache, clearCache, getCacheSize, addKnownWord, addManualKnownWord, removeManualKnownWord, isManualKnownWord, isKnownWord } from '../lib/wordCache.js';
import { getFrequency, startLoadingGlobalFrequency } from '../lib/frequencyMap.js';
import {
  clearJpAnalyzerShadowCache,
  useJpAnalyzerShadow
} from '../lib/useJpAnalyzerShadow.js';
import { adaptReaderSpansForRendering } from '../lib/analyzerReaderSpanAdapter.js';
import { findAdjacentTextScenes } from '../lib/scenePrefetch.js';
import { resolveAnalyzerPresentationClass } from '../lib/analyzerPresentationPolicy.js';
import { buildAnalyzerLearningModel, resolveLearningOwnership } from '../lib/analyzerLearningModel.js';
import { createAnalyzerReaderContext, getAnalyzerMiningLookupKey, getAnalyzerSelectionActionState, resolveAnalyzerReaderContextForOffsets } from '../lib/analyzerMiningSelection.js';
import { buildDebugReportV2, buildDiagnosticSummaryV2 } from '../lib/debugReportV2.js';
import { ANALYZER_METADATA_LEASE_MS, getAnalyzerMetadataLease } from '../lib/analyzerMetadataLease.js';
import {
  COLOR_SOURCES,
  normalizeColorSource,
  resolveVisibleColourSource
} from '../lib/colorSource.js';

/* â”€â”€â”€ Constants â”€â”€â”€ */
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
  return String(title || '').replace(/[ï¼ˆ(]\s*é›»æ’ƒæ–‡åº«\s*[ï¼‰)]/g, '').replace(/ã€[^ã€‘]*(é›»å­|ç‰¹å…¸|é™å®š|ç‰ˆ)[^ã€‘]*ã€‘/g, '').replace(/\s+/g, ' ').trim();
}

const dashRegex = /[â€”â€•â”€â”ãƒ¼]/;
const dashSingleRegex = /[â€”â€•â”€â”ãƒ¼]/g;

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

/* â”€â”€â”€ Word colour logic â”€â”€â”€ */
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


function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

/* â”€â”€â”€ Stable token range colouriser â”€â”€â”€ */
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

/* â”€â”€â”€ Vertical plain text â”€â”€â”€ */
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

/* â”€â”€â”€ Component â”€â”€â”€ */
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
  const [includeFullParserInventory, setIncludeFullParserInventory] = useState(false);
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
  const [teachingMode, setTeachingMode] = useState(false);
  const [teachingSelection, setTeachingSelection] = useState(null);
  const [analyzerRefreshKey, setAnalyzerRefreshKey] = useState(0);
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
      prefetchTexts: adjacentTextScenes.ordered.map(target => target.text),
      refreshKey: analyzerRefreshKey
    }
  );
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

  const jpAnalyzerPreviewAvailable =
    jpAnalyzerShadow?.status === 'ready' &&
    jpAnalyzerReader.valid === true &&
    jpAnalyzerReader.words.length > 0;

  const colourSourceResolution = resolveVisibleColourSource({
    requestedSource: colorSource,
    analyzerReady: jpAnalyzerPreviewAvailable,
    analyzerWords: jpAnalyzerReader.words
  });

  const activeDisplayWords = colourSourceResolution.words;
  const activeColorSource = colourSourceResolution.activeSource;
  const analyzerNeutralFallback =
    colourSourceResolution.neutralFallback;

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
    analyzerValid: jpAnalyzerPreviewAvailable && Boolean(analyzerLearningModel),
    analyzerModel: analyzerLearningModel
  }), [jpAnalyzerPreviewAvailable, analyzerLearningModel]);

  const comprehension = learningOwnership.comprehension;
  const unknownWords = learningOwnership.newWords;

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
    setTeachingSelection(null);
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

  async function handleCorrectionMutation(result) {
    clearJpAnalyzerShadowCache();
    setAnalyzerRefreshKey(value => value + 1);
    setSelectedReaderContext(null);
    setSelectionIssue('');
    setStatus({ type: 'working', message: `Correction revision ${result.correctionRevisionAfter || 'updated'}; refreshing reader analysis...` });
  }

  function handleTextSelection() {
    setTimeout(() => {
      const rawSelectedText = getSelectedWord();
      if (!rawSelectedText) return;
      if (teachingMode) {
        const result = resolveTeachingSelection({
          root: sentenceBoxRef.current,
          selection: window.getSelection(),
          sentence: currentData?.plainText || '',
          analyzerSpans: jpAnalyzerReader.words,
        });
        setTeachingSelection(result.valid ? result : null);
        setStatus({ type: result.valid ? 'ok' : 'error', message: teachingSelectionMessage(result) });
        if (!result.valid) return;
      }
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

  function getKnownKeyCandidates() {
    const key = String(selectedReaderContext?.knownLookupKey || '').trim();
    return key ? [key] : [];
  }

  function getPrimaryKnownKey(word) { return getKnownKeyCandidates()[0] || String(word || '').trim(); }
  function isManualKnownCandidate() { return getKnownKeyCandidates().some(candidate => isManualKnownWord(candidate)); }
  function isKnownCandidate() { return getKnownKeyCandidates().some(candidate => isKnownWord(candidate)); }

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

  function createCurrentDebugReport() {
    const actionState = getAnalyzerActionState();
    return buildDebugReportV2({
      application: {
        name: 'Novel Audio Miner',
        version: '4.1.0',
        colorSource,
        activeColorSource,
        learningSource: learningOwnership.source
      },
      book,
      reader: {
        sceneIndex: itemIndex,
        sceneNumber: itemIndex + 1,
        totalScenes,
        selectedText: selectedText || '',
        showFurigana: Boolean(showFurigana),
        verticalMode: Boolean(verticalMode),
        readerStyle,
        ankiStatus,
        globalFreqReady: Boolean(globalFreqReady),
        forceTts: Boolean(forceTts)
      },
      scene: {
        displayItemType: isImage ? 'image' : (isText ? 'sentence' : 'none'),
        chapterIndex: currentData?.chapterIndex ?? null,
        chapterTitle: currentData?.chapterTitle || '',
        plainText: currentData?.plainText || '',
        htmlText: currentData?.htmlText || '',
        imageAlt: currentData?.alt || '',
        hasImageDataUri: Boolean(currentData?.dataUri),
        parserDebug: currentData?.parserDebug || null
      },
      adjacentScenes: displayItems.slice(Math.max(0, itemIndex - 2), itemIndex + 3).map((item, offset) => {
        const absoluteIndex = Math.max(0, itemIndex - 2) + offset;
        const data = item?.data || null;
        return {
          index: absoluteIndex,
          relative: absoluteIndex - itemIndex,
          type: item?.type === 'illustration' ? 'image' : 'sentence',
          chapterIndex: data?.chapterIndex ?? null,
          chapterTitle: data?.chapterTitle || '',
          plainText: data?.plainText || '',
          parserDebug: data?.parserDebug || null
        };
      }),
      analyzerShadow: jpAnalyzerShadow,
      analyzerReader: jpAnalyzerReader,
      analyzerResult: jpAnalyzerShadow?.result || null,
      metadataLease: getAnalyzerMetadataLease(),
      metadataLeaseMs: ANALYZER_METADATA_LEASE_MS,
      presentationSpans: jpAnalyzerReader.words.map(span => ({
        start: span.start,
        end: span.end,
        surface: span.surface,
        displayRole: span.displayRole,
        className: getWordColorClass(span),
        known: span.knownLookupKey ? isKnownWord(span.knownLookupKey) : false,
        frequency: span.frequencyLookupKey ? getFrequency(span.frequencyLookupKey) : null
      })),
      learning: {
        available: learningOwnership.available,
        source: learningOwnership.source,
        comprehension,
        newWords: unknownWords
      },
      selection: {
        raw: selectedText || '',
        readerContext: selectedReaderContext,
        actionState,
        issue: selectionIssue || null
      },
      mining: {
        candidate: selectedReaderContext?.eligibleForMining ? selectedReaderContext : null,
        lookupIdentity: selectedReaderContext ? getAnalyzerMiningLookupKey(selectedReaderContext) : null,
        debug: miningDebug,
        enrichment: enrichResult,
        working: isWorking
      },
      prefetchTargets: adjacentTextScenes.ordered,
      includeFullParserInventory
    });
  }

  function handleExportDebugReport() {
    const report = createCurrentDebugReport();
    const safeTitle = cleanBookTitle(book?.title || book?.fileName || 'book').replace(/[\/:*?"<>|\s]+/g, '_').slice(0, 60) || 'book';
    downloadJsonFile(`novel-audio-miner-debug-v2-${safeTitle}-scene-${itemIndex + 1}.json`, report);
  }

  function handleCopyDiagnosticSummary() {
    navigator.clipboard?.writeText(buildDiagnosticSummaryV2(createCurrentDebugReport()));
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
      const fieldUpdates = { [fields.sentence]: result.sentence, [fields.sentenceFurigana]: result.sentenceFurigana || result.sentence, [fields.miscInfo]: [cleanedTitle, currentData?.chapterTitle || ''].filter(Boolean).join(' Â· ') };
      if (result.method !== 'voicevox') fieldUpdates[fields.selectionText] = novelSentence;
      if (result.method === 'voicevox') { try { updateMiningDebug({ status: 'running', stage: 'voicevoxAudio' }); const { audioBase64, filename } = await generateVoicevoxAudio(novelSentence); await ankiRequest('storeMediaFile', { filename, data: audioBase64 }); fieldUpdates[fields.sentenceAudio] = `[sound:${filename}]`; updateMiningDebug({ sentenceAudio: `[sound:${filename}]` }); } catch (err) { updateMiningDebug({ voicevoxError: err?.message || String(err) }); } }
      else if (result.audioUrl) { try { updateMiningDebug({ status: 'running', stage: 'nadeshikoAudio' }); const filename = `nade_audio_${Date.now()}.mp3`; await ankiRequest('storeMediaFile', { filename, url: result.audioUrl }); fieldUpdates[fields.sentenceAudio] = `[sound:${filename}]`; updateMiningDebug({ sentenceAudio: `[sound:${filename}]` }); } catch (e) { updateMiningDebug({ audioError: e?.message || String(e) }); } }
      if (result.method !== 'voicevox' && result.imageUrl) { try { updateMiningDebug({ status: 'running', stage: 'nadeshikoImage' }); const filename = `nade_img_${Date.now()}.jpg`; await ankiRequest('storeMediaFile', { filename, url: result.imageUrl }); fieldUpdates[fields.picture] = `<img src="${filename}">`; updateMiningDebug({ picture: `<img src="${filename}">` }); } catch (e) { updateMiningDebug({ imageError: e?.message || String(e) }); } }
      updateMiningDebug({ status: 'running', stage: 'updateNoteFields', preparedFields: fieldUpdates }); await updateNoteFields(noteId, fieldUpdates);
      if (analyzerCandidate?.knownLookupKey) addKnownWord(miningLookupKey); setCacheVersion(v => v + 1); try { await ankiRequest('guiBrowse', { query: `nid:${noteId}` }); } catch (e) {}
      updateMiningDebug({ status: 'completed', stage: 'done', updatedNoteId: noteId, preparedFields: fieldUpdates }); setStatus({ type: 'ok', message: `Card updated â€” ${result.source}${result.mode ? ` (${result.mode})` : ''}` });
    } catch (err) { updateMiningDebug({ status: 'error', stage: 'failed', error: err?.message || String(err) }); setStatus({ type: 'error', message: err?.message || String(err) }); }
    setIsWorking(false);
  }

  const boxStyle = {
    fontSize: `${readerStyle.fontSize}px`, lineHeight: readerStyle.lineHeight,
    fontFamily: FONT_STACKS[readerStyle.fontFamily] || FONT_STACKS.mincho
  };
  if (!totalScenes) return <section className="reader-card"><h2>{cleanedTitle}</h2><p>No content found.</p></section>;

  const hasDialogueColumns = Boolean(verticalMode && !showFurigana && isText && currentData?.plainText?.includes('\n'));
  const currentDisplayItem = displayItems[itemIndex] || null;


  return (
    <>
      <div className="status-bar">
        <div className="status-left">
          <span className={`status-dot ${ankiStatus.connected ? 'ok' : 'error'}`} />
          <span>Anki {ankiStatus.connected ? 'Connected' : 'Offline'}</span>
          {comprehension && (
            <>
              <span>Â·</span>
              <span>Comprehension: <strong>{comprehension.percent}%</strong> ({comprehension.known}/{comprehension.total})</span>
            </>
          )}
          {isText && !learningOwnership.available && (
            <>
              <span>Â·</span>
              <span>Analyzer learning model unavailable</span>
            </>
          )}
        </div>
        <div className="status-right">
          <span>{getCacheSize()} known</span>
          <span>Â·</span>
          <span>{!globalFreqReady ? 'Freq loading...' : forceTts ? 'VOICEVOX' : 'Nadeshiko'}</span>
          <span>Â·</span>
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
        <div className="sidebar-toggle" onClick={() => setSidebarOpen(v => !v)} title="Toggle sidebar (S)">{sidebarOpen ? 'âœ•' : 'â˜°'}</div>

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
                        title={`${uw.freq ? `Rank ${uw.freq.rank} Â· ${uw.freq.category}` : 'Unlisted'} Â· Click to select`}
                        onClick={() => selectNewWord(uw)}>
                        {display}
                      </button>
                      <button
                        type="button"
                        className="mark-known-mini"
                        title={`Mark ${display} as known`}
                        onClick={() => handleMarkKnown(uw.word)}>
                        âœ“
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
          <button className="secondary teaching-toggle" onClick={() => { setTeachingMode(v => !v); setTeachingSelection(null); }} style={{ fontSize: '11px', background: teachingMode ? 'var(--accent)' : undefined }}>
            Teaching Mode: {teachingMode ? 'ON' : 'OFF'}
          </button>
          <details open={showStyle} onToggle={e => setShowStyle(e.target.open)}>
            <summary style={{ fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>Reader style</summary>
            <div className="style-panel">
              <div className="style-row"><span>Font size</span><div><button onClick={() => stepStyle('fontSize', -2, 20, 46)}>âˆ’</button><b>{readerStyle.fontSize}</b><button onClick={() => stepStyle('fontSize', 2, 20, 46)}>+</button></div></div>
              <input type="range" min="20" max="46" value={readerStyle.fontSize} onChange={e => updateStyle({ fontSize: Number(e.target.value) })} />
              <div className="style-row"><span>Line spacing</span><div><button onClick={() => stepStyle('lineHeight', -0.1, 1.4, 2.8)}>âˆ’</button><b>{readerStyle.lineHeight.toFixed(2)}</b><button onClick={() => stepStyle('lineHeight', 0.1, 1.4, 2.8)}>+</button></div></div>
              <input type="range" min="1.4" max="2.8" step="0.05" value={readerStyle.lineHeight} onChange={e => updateStyle({ lineHeight: Number(e.target.value) })} />
              <div className="style-row"><span>Height</span><div><button onClick={() => stepStyle('height', -40, 420, 900)}>âˆ’</button><b>{readerStyle.height}</b><button onClick={() => stepStyle('height', 40, 420, 900)}>+</button></div></div>
              <input type="range" min="420" max="900" step="20" value={readerStyle.height} onChange={e => updateStyle({ height: Number(e.target.value) })} />
              <button className="secondary" onClick={resetStyle} style={{ marginTop: '8px', width: '100%', fontSize: '11px' }}>Reset to default</button>
            </div>
          </details>
          <details className="dictionary-settings">
            <summary>Settings Â· Dictionary Management</summary>
            <DictionaryManagementPanel />
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
                  <option value={COLOR_SOURCES.PLAIN_TEXT}>Plain text</option>
                </select>
                <span style={{ fontSize: '10px' }}>
                  JP Analyzer is the sole linguistic source. Plain Text changes presentation only; invalid analyzer output remains neutral.
                </span>
              </label>
              <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'grid', gap: '4px' }}>Session Token: <input value={sessionToken} onChange={e => handleSaveSessionToken(e.target.value)} placeholder="Paste __Secure-nadeshiko.session_token" /><span style={{ fontSize: '10px' }}>F12 â†’ Application â†’ Cookies â†’ nadeshiko.co</span></label>
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
                <div className="debug-panel-title">Debug Report</div>
              </div>
              <div className="debug-summary-grid">
                <div className="debug-mini-card"><span>Analyzer</span><strong>{jpAnalyzerShadow?.status ?? 'idle'}</strong></div>
                <div className="debug-mini-card"><span>Reader contract</span><strong>{jpAnalyzerReader.valid ? 'valid' : 'invalid'}</strong></div>
                <div className="debug-mini-card"><span>Result source</span><strong>{jpAnalyzerShadow?.source ?? '-'}</strong></div>
                <div className="debug-mini-card"><span>Scene</span><strong>{itemIndex + 1} / {totalScenes}</strong></div>
              </div>
              <label style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', fontSize: '10px', color: 'var(--muted)' }}>
                <input type="checkbox" checked={includeFullParserInventory} onChange={event => setIncludeFullParserInventory(event.target.checked)} />
                Include full EPUB parser inventory
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                <button type="button" className="debug-export-btn" onClick={handleExportDebugReport}>Export Debug Report</button>
                <button type="button" className="secondary" onClick={handleCopyDiagnosticSummary}>Copy Diagnostic Summary</button>
                <button type="button" className="secondary" onClick={clearJpAnalyzerShadowCache}>Clear Cached Sentence Analyses</button>
              </div>
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
              <button onClick={() => setItemIndex(i => Math.max(0, i - 1))} disabled={itemIndex === 0}>â†</button>
              <input type="number" min="1" max={totalScenes} value={goInput} onChange={e => setGoInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleGo(); }} placeholder={`1-${totalScenes}`} />
              <button onClick={handleGo}>Go</button>
              <button onClick={() => setItemIndex(i => Math.min(totalScenes - 1, i + 1))} disabled={itemIndex === totalScenes - 1}>â†’</button>
            </div>
            <span className="item-counter">{isText ? 'ðŸ“–' : 'ðŸ–¼ï¸'} Scene {itemIndex + 1}/{totalScenes}</span>
          </div>

          {isText && currentData && (
            <>
              <div ref={sentenceBoxRef}
                className="sentence-box"
                lang="ja" style={boxStyle}
                onMouseUp={handleTextSelection} onDoubleClick={handleTextSelection} onTouchEnd={handleTextSelection}>
                <div className={`sentence-content ${verticalMode ? 'vertical' : ''} ${hasDialogueColumns ? 'dialogue-columns' : ''}`}>
                  {renderStableSentence({
                    htmlText: currentData.htmlText,
                    plainText: currentData.plainText,
                    tokens: activeDisplayWords,
                    showFurigana,
                    verticalMode
                  })}
                </div>
              </div>
              {status.message && <div className={`status-message ${status.type}`} style={{ marginTop: '8px' }}>{status.message}</div>}
              {teachingMode && teachingSelection?.valid && (
                <div className="teaching-drawer-layer">
                  <TeachingPanel
                    selection={teachingSelection}
                    analysis={{ words: jpAnalyzerReader.words, candidates: jpAnalyzerShadow?.result?.readerCandidates || [], selection: jpAnalyzerShadow?.result?.readerSelection || {} }}
                    provenance={{
                      bookId: book?.id || null,
                      bookTitle: book?.title || book?.fileName || null,
                      chapterIndex: currentData?.chapterIndex ?? null,
                      chapterTitle: currentData?.chapterTitle || null,
                      sceneIndex: itemIndex,
                      leftContext: flatItems?.[itemIndex - 1]?.type === 'sentence' ? flatItems[itemIndex - 1]?.plainText || null : null,
                      rightContext: flatItems?.[itemIndex + 1]?.type === 'sentence' ? flatItems[itemIndex + 1]?.plainText || null : null,
                    }}
                    onClose={() => setTeachingSelection(null)}
                    onCorrectionMutation={handleCorrectionMutation}
                  />
                </div>
              )}
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
                <span className="word" title={selectedText}>{selectedText || 'â€”'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isWorking && <span className="mine-status">Working...</span>}
                {enrichResult && !isWorking && <span className="mine-status" style={{ color: 'var(--success)' }}>âœ“ {enrichResult.source}</span>}
                {(() => {
                  const action = getAnalyzerActionState();
                  if (!selectedText) return <button className="secondary mark-known-btn" disabled>Mark as Known</button>;
                  if (action.canUndoKnown) return <button className="secondary mark-known-btn" onClick={() => handleUndoKnown(selectedText)} disabled={isWorking}>Undo Known</button>;
                  if (action.knownFromAnki) return <button className="secondary mark-known-btn known-from-anki-btn" disabled title="This analyzer lookup key is already known from Anki/cache.">Known from Anki</button>;
                  if (action.canMarkKnown) return <button className="secondary mark-known-btn" onClick={() => handleMarkKnown(selectedText)} disabled={isWorking}>Mark as Known</button>;
                  return <button className="secondary mark-known-btn non-learning-word-btn" disabled title={selectionIssue || action.knownMessage}>{action.knownMessage || 'Not vocabulary-known eligible'}</button>;
                })()}
                <button className="mine-btn" onClick={handleMine} disabled={!selectedText || isWorking || (!selectedReaderContext || selectedReaderContext.eligibleForMining !== true)}>âš¡ Mine to Anki</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

