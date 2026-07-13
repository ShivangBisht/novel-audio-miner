import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import Phase8DictionarySyncPanel from './Phase8DictionarySyncPanel.jsx';
import {
  analyzeMiningWords,
  convertYomitanExpressionBankRows,
  convertYomitanGrammarBankRows,
  convertYomitanNameBankRows,
  convertYomitanTermBankRows,
  getLongestDictionaryMatches,
  loadLocalDictionary,
  lookupExact,
  lookupWithDictionaryForms,
  normalizeDictionaryEntry
} from '../lib/dictionaryLookup.js';
import { finalizeAnalyzerStructure } from '../lib/dictionaryValidationBridge.js';
import {
  clearTermDictionarySnapshots,
  deleteTermDictionarySnapshot,
  loadTermDictionaryEntriesForMeta,
  loadTermDictionaryMetas,
  saveTermDictionarySnapshot
} from '../lib/dictionaryStorage.js';
import {
  createDictionaryId,
  createDictionaryProfile,
  normalizeYomitanExpressionRows,
  normalizeYomitanGrammarRows,
  normalizeYomitanNameRows,
  normalizeYomitanTermRows
} from '../lib/dictionaryDetection.js';

const BATCH_SIZE = 5000;
const COMMON_FUNCTION_WORDS = new Set(['この','その','あの','どの','これ','それ','あれ','どれ','ここ','そこ','あそこ','どこ','こう','そう','どう','こんな','そんな','あんな','どんな','まで','だけ','くらい','ぐらい','ほど','なら','ので','のに','ため','よう','もの','こと','という','って','て','に','を','は','が','へ','で','と','や','も','の','な','なの']);

function yieldToBrowser() { return new Promise(resolve => setTimeout(resolve, 0)); }
function getFileBasename(path) { return String(path || '').split('/').pop(); }
function classifyYomitanFile(path) { const name = getFileBasename(path); if (name === 'index.json') return 'index'; if (/^term_bank_\d+\.json$/i.test(name)) return 'term_bank'; if (/^term_meta_bank_\d+\.json$/i.test(name)) return 'term_meta_bank'; if (/^tag_bank_\d+\.json$/i.test(name)) return 'tag_bank'; if (/^kanji_bank_\d+\.json$/i.test(name)) return 'kanji_bank'; return 'other'; }
async function readJsonFromZip(zip, path) { const file = zip.file(path); if (!file) return null; return JSON.parse(await file.async('string')); }
function describeRowShape(row) { if (!Array.isArray(row)) return { type: typeof row, length: null, columns: [] }; return { type: 'array', length: row.length, columns: row.map(value => Array.isArray(value) ? `array(${value.length})` : value && typeof value === 'object' ? 'object' : typeof value) }; }
function safeFileName(value, fallback = 'dictionary') { return String(value || fallback).replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+/g, '_').slice(0, 80) || fallback; }
function downloadJsonFile(filename, data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }

function getEvidenceType(entry) { const type = entry?.dictionaryType || entry?.type || 'term'; return ['term','expression','name','grammar'].includes(type) ? type : 'term'; }
function groupDictionaryEvidence(entries = []) { const grouped = { name: [], grammar: [], expression: [], term: [], other: [] }; for (const entry of entries || []) { const type = getEvidenceType(entry); (grouped[type] || grouped.other).push(entry); } return grouped; }
function looksNumericText(text) { return /^[0-9０-９一二三四五六七八九十百千万億兆〇零]+$/.test(String(text || '').trim()); }
function hasKanjiOrKatakana(text) { return /[一-龯々ァ-ヶー]/.test(String(text || '')); }
function buildClassificationCandidate(selectedText, grouped) {
  const text = String(selectedText || '').trim();
  const counts = { name: grouped.name.length, grammar: grouped.grammar.length, expression: grouped.expression.length, term: grouped.term.length };
  if (!text) return { candidate: 'none', confidence: 'none', reason: 'No selected text.', counts };
  if (looksNumericText(text)) return { candidate: 'numeric-or-counter', confidence: 'strong', reason: 'Numeric-looking text should not be overridden by dictionary evidence.', counts };
  if (COMMON_FUNCTION_WORDS.has(text)) {
    if (counts.grammar || counts.expression) return { candidate: 'function-expression', confidence: 'strong', reason: 'Common function/grammar-like item with grammar/expression evidence.', counts };
    return { candidate: 'function-word', confidence: 'strong', reason: 'Common function/demonstrative/adverbial item. Guard against name/term false positives.', counts };
  }
  if (counts.name) {
    const strongNameTag = grouped.name.some(entry => /fem|masc|given|surname|person|place|company|organization/i.test(`${Array.isArray(entry.tags) ? entry.tags.join(' ') : ''} ${entry.nameType || ''}`));
    if (hasKanjiOrKatakana(text) || strongNameTag) return { candidate: 'proper-name', confidence: strongNameTag ? 'strong' : 'medium', reason: 'Name dictionary evidence exists and form/tags support name classification.', counts };
    return { candidate: 'possible-name', confidence: 'weak', reason: 'Name evidence exists but kana-only text needs context.', counts };
  }
  if (counts.grammar) return { candidate: 'grammar-expression', confidence: 'medium', reason: 'Grammar dictionary evidence exists.', counts };
  if (counts.expression) return { candidate: 'expression', confidence: 'medium', reason: 'Expression dictionary evidence exists.', counts };
  if (counts.term) return { candidate: 'dictionary-term', confidence: 'medium', reason: 'Term dictionary evidence exists without name/grammar/expression evidence.', counts };
  return { candidate: 'tokenizer-fallback', confidence: 'none', reason: 'No dictionary evidence found.', counts };
}
function generatePhraseCandidates(text) { const source = String(text || '').trim(); const out = new Set(); if (!source) return []; out.add(source); const suffixes = ['なの','まで','だけ','くらい','ぐらい','ほど','こと','もの','の','な']; for (const suffix of suffixes) if (source.endsWith(suffix) && source.length > suffix.length) { out.add(source.slice(0, source.length - suffix.length)); out.add(suffix); } if (source.length <= 8) for (let start = 0; start < source.length; start += 1) for (let end = start + 1; end <= source.length; end += 1) out.add(source.slice(start, end)); return Array.from(out).filter(Boolean).sort((a,b)=>b.length-a.length||a.localeCompare(b)).slice(0, 40); }

function createEmptyRuntimeIndex() { return { entries: [], byTerm: new Map(), byFirstChar: new Map(), sources: new Set(), entryCount: 0, builtAt: new Date().toISOString() }; }
function addEntryToRuntimeIndex(index, rawEntry) {
  const entry = normalizeDictionaryEntry(rawEntry, rawEntry?.sourceDictionary || rawEntry?.source || 'imported');
  if (!entry?.term) return;
  index.entryCount += 1;
  index.sources.add(entry.sourceDictionary || entry.source || 'unknown');
  if (!index.byTerm.has(entry.term)) index.byTerm.set(entry.term, []);
  index.byTerm.get(entry.term).push(entry);
  const first = entry.term[0];
  if (!index.byFirstChar.has(first)) index.byFirstChar.set(first, []);
  index.byFirstChar.get(first).push(entry);
}

function summarizeMetas(metas = []) {
  const result = { term: { dicts: 0, entries: 0 }, expression: { dicts: 0, entries: 0 }, name: { dicts: 0, entries: 0 }, grammar: { dicts: 0, entries: 0 }, other: { dicts: 0, entries: 0 }, totalEntries: 0 };
  for (const meta of metas || []) {
    const type = ['term','expression','name','grammar'].includes(meta.type) ? meta.type : 'other';
    result[type].dicts += 1;
    result[type].entries += Number(meta.entryCount || 0);
    result.totalEntries += Number(meta.entryCount || 0);
  }
  return result;
}

async function inspectYomitanZip(file, priority = 1) {
  const zip = await JSZip.loadAsync(file);
  const fileNames = Object.keys(zip.files).filter(path => !zip.files[path].dir);
  const filesByType = {};
  for (const path of fileNames) { const type = classifyYomitanFile(path); if (!filesByType[type]) filesByType[type] = []; filesByType[type].push(path); }
  const summary = { fileName: file.name, loadedAt: new Date().toISOString(), fileCount: fileNames.length, filesByType, index: null, termBankFiles: filesByType.term_bank || [], termMetaBankFiles: filesByType.term_meta_bank || [], tagBankFiles: filesByType.tag_bank || [], kanjiBankFiles: filesByType.kanji_bank || [], estimatedRowsByType: {}, sampledRows: [], errors: [] };
  try { summary.index = await readJsonFromZip(zip, 'index.json'); } catch (error) { summary.errors.push({ file: 'index.json', error: error?.message || String(error) }); }
  const title = summary.index?.title || summary.index?.name || file.name;
  summary.dictionaryId = createDictionaryId(title, file.name);
  for (const type of ['term_bank','term_meta_bank','tag_bank','kanji_bank']) {
    summary.estimatedRowsByType[type] = 0;
    const files = filesByType[type] || [];
    for (const path of files.slice(0, 3)) {
      try {
        const rows = await readJsonFromZip(zip, path);
        if (Array.isArray(rows)) {
          summary.estimatedRowsByType[type] += rows.length;
          if (summary.sampledRows.length < 8) {
            const needed = 8 - summary.sampledRows.length;
            summary.sampledRows.push(...rows.slice(0, needed).map(row => ({ type, file: path, row })));
          }
        }
      } catch (error) { summary.errors.push({ file: path, error: error?.message || String(error) }); }
    }
  }
  const profile = createDictionaryProfile(summary, summary.sampledRows, priority);
  return { zip, summary, profile };
}

async function importYomitanDetectionDictionary(file, priority, onProgress) {
  const { zip, summary, profile } = await inspectYomitanZip(file, priority);
  const title = summary.index?.title || summary.index?.name || file.name;
  const dictionaryId = profile.id;
  if (!profile.supported || !['term','expression','name','grammar'].includes(profile.detectedType)) throw new Error(`Dictionary is not supported for detection import yet. Detected: ${profile.detectedType}. ${profile.reason}`);
  const entries = [];
  const detectionEntries = [];
  let rowsRead = 0;
  for (let i = 0; i < summary.termBankFiles.length; i += 1) {
    const path = summary.termBankFiles[i];
    onProgress?.(`Reading ${path} (${i + 1}/${summary.termBankFiles.length})`);
    const rows = await readJsonFromZip(zip, path);
    if (!Array.isArray(rows)) continue;
    rowsRead += rows.length;
    if (profile.detectedType === 'name') { entries.push(...convertYomitanNameBankRows(rows, title, dictionaryId, priority)); detectionEntries.push(...normalizeYomitanNameRows(rows, title, priority, dictionaryId)); }
    else if (profile.detectedType === 'grammar') { entries.push(...convertYomitanGrammarBankRows(rows, title, dictionaryId, priority)); detectionEntries.push(...normalizeYomitanGrammarRows(rows, title, priority, dictionaryId)); }
    else if (profile.detectedType === 'expression') { entries.push(...convertYomitanExpressionBankRows(rows, title, dictionaryId, priority)); detectionEntries.push(...normalizeYomitanExpressionRows(rows, title, priority, dictionaryId)); }
    else { entries.push(...convertYomitanTermBankRows(rows, title, dictionaryId, priority)); detectionEntries.push(...normalizeYomitanTermRows(rows, title, priority, dictionaryId)); }
    if (i % 3 === 0) await yieldToBrowser();
  }
  const normalizedProfile = { ...profile, normalizedEntries: detectionEntries.length, sampleNormalizedEntries: detectionEntries.slice(0, 8) };
  const summaryWithDetection = { ...summary, importedTitle: title, importedEntries: entries.length, importedRows: rowsRead, detectionProfile: normalizedProfile, normalizedEntries: detectionEntries.length };
  return { entries, profile: normalizedProfile, summary: summaryWithDetection, title, dictionaryId, priority };
}

function MiniCard({ label, value }) { return <div className="debug-mini-card"><span>{label}</span><strong>{value}</strong></div>; }
function EvidenceList({ title, entries }) { return <details className="debug-nested"><summary>{title} ({entries.length})</summary>{entries.length === 0 ? <div className="debug-empty">No evidence.</div> : <div className="debug-token-list dictionary-debug-match-list">{entries.slice(0, 6).map((entry, index) => <div className="debug-token-row" key={`${entry.dictionaryId}-${entry.term}-${index}`}><div className="debug-token-main"><span className="debug-token-index">#{index + 1}</span><strong>{entry.term}</strong><span>{entry.reading || '-'}</span></div><div className="debug-token-meta"><span>{entry.sourceDictionary || '-'}</span><span>{entry.dictionaryType || 'term'}</span><span>{entry.expressionType || entry.grammarType || entry.nameType || (entry.tags?.join?.(', ') || '-')}</span></div></div>)}</div>}</details>; }
function EvidencePreview({ selectedText, entries }) { const grouped = groupDictionaryEvidence(entries); const candidate = buildClassificationCandidate(selectedText, grouped); if (!selectedText) return <div className="debug-empty">Select a word to inspect dictionary evidence.</div>; return <details className="debug-nested" open><summary>selected evidence preview</summary><div className="debug-summary-grid"><MiniCard label="Candidate" value={candidate.candidate}/><MiniCard label="Name" value={candidate.counts.name}/><MiniCard label="Grammar" value={candidate.counts.grammar}/><MiniCard label="Expression" value={candidate.counts.expression}/><MiniCard label="Term" value={candidate.counts.term}/></div><div className="debug-empty">{candidate.reason}</div><EvidenceList title="Name evidence" entries={grouped.name}/><EvidenceList title="Grammar evidence" entries={grouped.grammar}/><EvidenceList title="Expression evidence" entries={grouped.expression}/><EvidenceList title="Term evidence" entries={grouped.term}/></details>; }
function ComponentPreview({ dictionaryIndex, selectedText }) { const [ran, setRan] = useState(false); const candidates = useMemo(() => { if (!ran || !dictionaryIndex || !selectedText) return []; return generatePhraseCandidates(selectedText).map(candidate => ({ candidate, matches: lookupExact(dictionaryIndex, candidate) })).filter(item => item.matches.length > 0); }, [ran, dictionaryIndex, selectedText]); useEffect(() => { setRan(false); }, [selectedText]); if (!selectedText) return null; return <details className="debug-nested"><summary>selected phrase component QA</summary><button type="button" className="secondary" onClick={() => setRan(true)} disabled={!dictionaryIndex}>Run component QA</button>{ran && <div className="debug-token-list">{candidates.length === 0 ? <div className="debug-empty">No component evidence.</div> : candidates.slice(0, 20).map(item => { const grouped = groupDictionaryEvidence(item.matches); return <div className="debug-token-row" key={item.candidate}><div className="debug-token-main"><strong>{item.candidate}</strong><span>{item.matches.length} match(es)</span></div><div className="debug-token-meta"><span>name: {grouped.name.length}</span><span>grammar: {grouped.grammar.length}</span><span>expression: {grouped.expression.length}</span><span>term: {grouped.term.length}</span><span>top: {item.matches[0]?.sourceDictionary || '-'}</span></div></div>; })}</div>}</details>; }
function QASearchPanel({ dictionaryIndex }) { const [query, setQuery] = useState(''); const [results, setResults] = useState(null); function runSearch() { const q = query.trim(); if (!q || !dictionaryIndex) return; const exact = lookupExact(dictionaryIndex, q); const components = generatePhraseCandidates(q).map(candidate => ({ candidate, matches: lookupExact(dictionaryIndex, candidate) })).filter(item => item.matches.length > 0); setResults({ query: q, exact, components }); } return <details className="debug-nested"><summary>manual dictionary QA search</summary><div className="dictionary-import-row"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search exact headword, e.g. どうなの"/><button type="button" className="secondary" onClick={runSearch} disabled={!dictionaryIndex || !query.trim()}>Search exact/components</button></div>{results && <details className="debug-nested" open><summary>QA result for: {results.query}</summary><div className="debug-summary-grid"><MiniCard label="Exact" value={results.exact.length}/><MiniCard label="Components" value={results.components.length}/></div><EvidencePreview selectedText={results.query} entries={results.exact}/><div className="debug-token-list">{results.components.slice(0, 20).map(item => { const grouped = groupDictionaryEvidence(item.matches); return <div className="debug-token-row" key={item.candidate}><div className="debug-token-main"><strong>{item.candidate}</strong><span>{item.matches.length} match(es)</span></div><div className="debug-token-meta"><span>name: {grouped.name.length}</span><span>grammar: {grouped.grammar.length}</span><span>expression: {grouped.expression.length}</span><span>term: {grouped.term.length}</span><span>top: {item.matches[0]?.sourceDictionary || '-'}</span></div></div>; })}</div></details>}</details>; }
function DictionaryList({ metas, onDelete }) { if (!metas.length) return <div className="debug-empty">No saved dictionaries yet.</div>; return <details className="debug-nested"><summary>saved dictionaries ({metas.length})</summary><div className="debug-token-list">{metas.map(meta => <div className="debug-token-row" key={meta.id}><div className="debug-token-main"><span className="debug-token-index">#{meta.priority}</span><strong>{meta.title}</strong></div><div className="debug-token-meta"><span>{meta.type || 'term'}</span><span>{meta.entryCount} entries</span><span>{meta.adapter}</span></div><div className="dictionary-import-row"><button type="button" className="secondary" onClick={() => onDelete(meta.id)}>Delete</button></div></div>)}</div></details>; }
function ProfileSummary({ profile, summary }) { if (!profile && !summary) return null; const rows = summary?.sampledRows || []; return <details className="debug-nested"><summary>latest dictionary inspection</summary><div className="debug-summary-grid"><MiniCard label="Title" value={profile?.title || summary?.index?.title || '-'}/><MiniCard label="Category" value={profile?.detectedType || '-'}/><MiniCard label="Adapter" value={profile?.adapter || '-'}/><MiniCard label="Supported" value={profile?.supported ? 'yes' : 'no'}/></div><div className="debug-empty">{profile?.reason || '-'}</div>{rows.length > 0 && <details className="debug-nested"><summary>sample row shapes</summary><pre>{JSON.stringify(rows.map(item => ({ type: item.type, file: item.file, shape: describeRowShape(item.row) })), null, 2)}</pre></details>}</details>; }
function Importer({ nextPriority, onDictionaryImported, onProfileInspected }) { const [status, setStatus] = useState('idle'); const [summary, setSummary] = useState(null); const [profile, setProfile] = useState(null); const [progress, setProgress] = useState(''); const [error, setError] = useState(''); async function handleZipFile(event, mode) { const file = event.target.files?.[0]; if (!file) return; setStatus(mode === 'import' ? 'importing' : 'inspecting'); setProgress(''); setError(''); setSummary(null); setProfile(null); try { if (mode === 'import') { const result = await importYomitanDetectionDictionary(file, nextPriority, setProgress); setProgress(`Saving ${result.entries.length} entries...`); await onDictionaryImported(result); setSummary(result.summary); setProfile(result.profile); setStatus('imported'); setProgress(`Imported ${result.entries.length} entries as ${result.profile.detectedType}.`); } else { const result = await inspectYomitanZip(file, nextPriority); setSummary(result.summary); setProfile(result.profile); onProfileInspected?.(result.profile); setStatus('inspected'); } } catch (err) { setError(err?.message || String(err)); setStatus('error'); } finally { event.target.value = ''; } } function exportInspection() { if (!summary && !profile) return; const title = profile?.title || summary?.index?.title || summary?.fileName || 'dictionary'; downloadJsonFile(`novel-audio-miner-dictionary-inspection-${safeFileName(title)}.json`, { exportedAt: new Date().toISOString(), summary, profile }); } return <details className="debug-nested"><summary>Import / inspect dictionary</summary><div className="dictionary-import-row"><label className="secondary dictionary-import-label">Inspect ZIP<input type="file" accept=".zip,application/zip" onChange={event => handleZipFile(event, 'inspect')}/></label><label className="secondary dictionary-import-label">Import ZIP as categorized dictionary<input type="file" accept=".zip,application/zip" onChange={event => handleZipFile(event, 'import')}/></label><button type="button" className="secondary" onClick={exportInspection} disabled={!summary && !profile}>Export inspection JSON</button></div><div className="debug-kv-list"><div className="debug-kv"><span>status</span><code>{status}</code></div><div className="debug-kv"><span>progress</span><code>{progress || '-'}</code></div><div className="debug-kv"><span>nextPriority</span><code>{nextPriority}</code></div></div>{error && <details className="debug-nested" open><summary>error</summary><pre>{error}</pre></details>}<ProfileSummary profile={profile} summary={summary}/></details>; }

function MiningWordAnalysisPreview({ dictionaryIndex, currentData }) {
  const [analysis, setAnalysis] = useState(null);
  useEffect(() => { setAnalysis(null); }, [currentData?.plainText, dictionaryIndex]);
  function runAnalysis() {
    if (!dictionaryIndex || !currentData) return;
    setAnalysis(analyzeMiningWords(dictionaryIndex, currentData));
  }
  function exportAnalysis() {
    if (!analysis) return;
    downloadJsonFile(`novel-audio-miner-word-analysis-${Date.now()}.json`, {
      exportedAt: new Date().toISOString(),
      sentence: analysis.sentence,
      tokenCount: analysis.tokenCount,
      rows: analysis.rows.map(row => ({
        surface: row.surface,
        lemma: row.lemma,
        category: row.category,
        subtype: row.subtype,
        trailingGrammar: row.trailingGrammar,
        frequencyKey: row.frequencyKey,
        knownWordKey: row.knownWordKey,
        fallbackFrequencyKey: row.fallbackFrequencyKey || '',
        fallbackKnownWordKey: row.fallbackKnownWordKey || '',
        internalParticles: row.internalParticles || [],
        reconstruction: row.reconstruction || null,
        countsForComprehension: row.countsForComprehension,
        showInNewWords: row.showInNewWords,
        colorRole: row.colorRole,
        confidence: row.confidence,
        reason: row.reason,
        matchMethod: row.matchMethod,
        evidence: row.evidence,
        tokens: row.tokens.map(token => ({
          surface: token.surface || token.text || '',
          dictionaryForm: token.dictionaryForm || token.basicForm || token.baseForm || token.lemma || '',
          pos: token.pos || '',
          posDetail1: token.posDetail1 || '',
          posDetail2: token.posDetail2 || '',
          tokenCategory: token.tokenCategory || ''
        }))
      }))
    });
  }
  return (
    <details className="debug-nested" open>
      <summary>mining word analysis preview</summary>
      <div className="debug-empty">Read-only proposal for lexical spans, lemmas, categories, frequency keys, comprehension, New Words and color roles.</div>
      <div className="dictionary-import-row">
        <button type="button" className="secondary" onClick={runAnalysis} disabled={!dictionaryIndex || !currentData?.plainText}>Analyze current sentence</button>
        <button type="button" className="secondary" onClick={exportAnalysis} disabled={!analysis}>Export word analysis JSON</button>
      </div>
      {analysis && (
        <>
          <div className="debug-summary-grid">
            <MiniCard label="Tokenizer tokens" value={analysis.tokenCount} />
            <MiniCard label="Proposed spans" value={analysis.rows.length} />
            <MiniCard label="Learning spans" value={analysis.rows.filter(row => row.category === 'term').length} />
            <MiniCard label="Excluded spans" value={analysis.rows.filter(row => !row.countsForComprehension).length} />
          </div>
          <div className="debug-empty">{analysis.sentence}</div>
          <div className="debug-token-list">
            {analysis.rows.map((row, index) => (
              <div className="debug-token-row" key={`${row.surface}-${index}`}>
                <div className="debug-token-main">
                  <span className="debug-token-index">#{index + 1}</span>
                  <strong>{row.surface}</strong>
                  <span>→ {row.lemma || '-'}</span>
                </div>
                <div className="debug-token-meta">
                  <span>{row.category} / {row.subtype}</span>
                  <span>method: {row.matchMethod || '-'}</span>
                  <span>confidence: {row.confidence}</span>
                  <span>frequency: {row.frequencyKey || '-'}</span>
                  <span>known: {row.knownWordKey || '-'}</span>
                  <span>comprehension: {row.countsForComprehension ? 'yes' : 'no'}</span>
                  <span>New Words: {row.showInNewWords ? 'yes' : 'no'}</span>
                  <span>color: {row.colorRole}</span>
                  <span>grammar tail: {row.trailingGrammar?.join(' / ') || '-'}</span>
                  <span>evidence T/E/G/N: {row.evidence.counts.term}/{row.evidence.counts.expression}/{row.evidence.counts.grammar}/{row.evidence.counts.name}</span>
                </div>
                <div className="debug-empty">{row.reason}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </details>
  );
}

function AnalyzerDictionaryValidationPreview({ dictionaryIndex, currentData, isLoadingIndex }) {
  const [status, setStatus] = useState('not run');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const sentence = String(currentData?.plainText || '').trim();

  useEffect(() => {
    setStatus('not run');
    setResult(null);
    setError('');
  }, [sentence, dictionaryIndex]);

  async function runValidation() {
    if (!dictionaryIndex || !sentence || isLoadingIndex) return;
    setStatus('analyzing');
    setResult(null);
    setError('');
    try {
      const response = await fetch('http://127.0.0.1:8766/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ text: sentence, include_ginza: true, sudachi_modes: ['C'] })
      });
      if (!response.ok) throw new Error(`Analyzer structure request failed: ${response.status} ${response.statusText}`);
      const payload = await response.json();
      const structure = payload?.structure;
      if (!structure) throw new Error('Analyzer response did not contain structure output.');

      setStatus('validating dictionary candidates');
      const finalized = await finalizeAnalyzerStructure({
        structure,
        lookupExact: (headword) => lookupExact(dictionaryIndex, headword),
        analyzerBaseUrl: 'http://127.0.0.1:8766'
      });
      setResult(finalized);
      setStatus(finalized?.validationStatus || 'complete');
    } catch (caught) {
      setError(caught?.message || String(caught));
      setStatus('error');
    }
  }

  function exportResult() {
    if (!result) return;
    downloadJsonFile(`phase-7b3-dictionary-validation-${Date.now()}.json`, {
      exportedAt: new Date().toISOString(),
      sentence,
      result
    });
  }

  const decisions = result?.candidateDecisions || [];
  const finalSpans = result?.finalSpans || [];

  return (
    <details className="debug-nested" open>
      <summary>Phase 7B.3 analyzer + dictionary validation</summary>
      <div className="dictionary-import-row">
        <button
          type="button"
          className="secondary"
          onClick={runValidation}
          disabled={!dictionaryIndex || !sentence || isLoadingIndex || status === 'analyzing' || status === 'validating dictionary candidates'}
        >
          Analyze and validate current sentence
        </button>
        <button type="button" className="secondary" onClick={exportResult} disabled={!result}>
          Export validation JSON
        </button>
      </div>
      <div className="debug-summary-grid">
        <MiniCard label="Status" value={status} />
        <MiniCard label="Candidates" value={decisions.length} />
        <MiniCard label="Final spans" value={finalSpans.length} />
        <MiniCard label="Coverage" value={result?.finalCoverage?.complete === true ? 'complete' : result ? 'incomplete' : '-'} />
      </div>
      {!dictionaryIndex && <div className="debug-empty">Load the runtime dictionary index first.</div>}
      {!sentence && <div className="debug-empty">No current sentence is available.</div>}
      {error && <details className="debug-nested" open><summary>validation error</summary><pre>{error}</pre></details>}
      {decisions.length > 0 && (
        <div className="debug-token-list">
          {decisions.map((decision, index) => (
            <div className="debug-token-row" key={decision.candidateId || `${decision.candidateHeadword}-${index}`}>
              <div className="debug-token-main">
                <span className="debug-token-index">#{index + 1}</span>
                <strong>{decision.candidateHeadword}</strong>
                <span>{decision.decision}</span>
              </div>
              <div className="debug-token-meta">
                <span>surface: {decision.surface}</span>
                <span>type: {decision.type}</span>
                <span>matches: {decision.dictionaryValidation?.exactMatchCount ?? 0}</span>
                <span>sources: {decision.dictionaryValidation?.sourceCount ?? 0}</span>
                <span>lexicalized: {decision.dictionaryValidation?.lexicalizedEvidence ? 'yes' : 'no'}</span>
              </div>
              <div className="debug-empty">{decision.decisionReason}</div>
            </div>
          ))}
        </div>
      )}
      {result && decisions.length === 0 && <div className="debug-empty">The analyzer returned no dictionary-validation candidates for this sentence.</div>}
      {finalSpans.length > 0 && (
        <details className="debug-nested" open>
          <summary>final structural spans ({finalSpans.length})</summary>
          <div className="debug-token-list">
            {finalSpans.map((span, index) => (
              <div className="debug-token-row" key={`${span.start}-${span.end}-${index}`}>
                <div className="debug-token-main">
                  <span className="debug-token-index">#{index + 1}</span>
                  <strong>{span.surface}</strong>
                  <span>{span.lexicalHead || '-'}</span>
                </div>
                <div className="debug-token-meta">
                  <span>{span.start}-{span.end}</span>
                  <span>{span.role}</span>
                  <span>{span.confidence || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </details>
  );
}

export default function DictionaryDebugPanel({ selectedText, currentData }) {
  const [dictionaryIndex, setDictionaryIndex] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeDictionary, setActiveDictionary] = useState('seed');
  const [storageStatus, setStorageStatus] = useState('not loaded');
  const [storageMessage, setStorageMessage] = useState('Dictionaries are not loaded automatically. Click Load all dictionaries when detection is needed.');
  const [metas, setMetas] = useState([]);
  const [latestProfile, setLatestProfile] = useState(null);
  const [sentenceMatches, setSentenceMatches] = useState([]);
  const [scanStatus, setScanStatus] = useState('not run');
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const loadRunRef = useRef(0);

  async function refreshMetas() { const loaded = await loadTermDictionaryMetas(); setMetas(loaded); return loaded; }

  useEffect(() => { let cancelled = false; async function loadSeed() { try { const index = await loadLocalDictionary('/dict/user_dictionary_seed.json'); const loaded = await loadTermDictionaryMetas(); if (!cancelled) { setDictionaryIndex(index); setMetas(loaded); setActiveDictionary('seed'); setStorageStatus(loaded.length ? 'saved dictionaries available' : 'no saved dictionaries'); setStorageMessage(loaded.length ? `${loaded.length} saved dictionaries available. Click Load all dictionaries.` : 'Using seed dictionary. Import dictionaries to build detection evidence.'); } } catch (error) { if (!cancelled) { setDictionaryIndex(null); setLoadError(error?.message || String(error)); setStorageStatus('error'); } } } loadSeed(); return () => { cancelled = true; }; }, []);
  useEffect(() => { setSentenceMatches([]); setScanStatus('not run'); }, [currentData?.plainText, activeDictionary]);

  async function handleLoadAll() {
    const runId = loadRunRef.current + 1;
    loadRunRef.current = runId;
    setIsLoadingIndex(true);
    setStorageStatus('loading dictionaries');
    setStorageMessage('Loading saved dictionary metadata...');
    try {
      const loadedMetas = await loadTermDictionaryMetas();
      if (!loadedMetas.length) { setStorageStatus('no saved dictionaries'); setStorageMessage('No saved dictionaries found. Import ZIP files first.'); setIsLoadingIndex(false); return; }
      const runtimeIndex = createEmptyRuntimeIndex();
      let processed = 0;
      for (let metaIndex = 0; metaIndex < loadedMetas.length; metaIndex += 1) {
        if (loadRunRef.current !== runId) return;
        const meta = loadedMetas[metaIndex];
        setStorageMessage(`Loading ${meta.title} (${metaIndex + 1}/${loadedMetas.length})...`);
        const entries = await loadTermDictionaryEntriesForMeta(meta);
        for (let i = 0; i < entries.length; i += 1) {
          addEntryToRuntimeIndex(runtimeIndex, entries[i]);
          processed += 1;
          if (processed % BATCH_SIZE === 0) {
            setStorageMessage(`Indexing ${processed.toLocaleString()} / ${summarizeMetas(loadedMetas).totalEntries.toLocaleString()} entries...`);
            await yieldToBrowser();
          }
        }
        await yieldToBrowser();
      }
      setDictionaryIndex(runtimeIndex);
      setMetas(loadedMetas);
      setActiveDictionary(`${loadedMetas.length} dictionaries`);
      setStorageStatus('loaded dictionaries');
      setStorageMessage(`Loaded ${processed.toLocaleString()} entries from ${loadedMetas.length} dictionaries. Runtime index is minimal and selection-safe.`);
    } catch (error) {
      setStorageStatus('error');
      setStorageMessage(error?.message || String(error));
    } finally {
      if (loadRunRef.current === runId) setIsLoadingIndex(false);
    }
  }

  function handleCancelLoad() { loadRunRef.current += 1; setIsLoadingIndex(false); setStorageStatus('cancelled'); setStorageMessage('Dictionary index loading was cancelled.'); }
  async function handleDictionaryImported(result) { const meta = await saveTermDictionarySnapshot({ id: result.dictionaryId, title: result.title, priority: result.priority, entries: result.entries, summary: result.summary, profile: result.profile }); setLatestProfile(result.profile); const loaded = await refreshMetas(); setStorageStatus('saved dictionary'); setStorageMessage(`Saved ${meta.title} as ${meta.type}. Saved dictionaries: ${loaded.length}. Click Load all dictionaries when needed.`); }
  async function handleDelete(id) { await deleteTermDictionarySnapshot(id); const loaded = await refreshMetas(); setStorageStatus('deleted dictionary'); setStorageMessage(`Deleted dictionary. Saved dictionaries: ${loaded.length}. Reload index if needed.`); }
  async function handleClearAll() { loadRunRef.current += 1; await clearTermDictionarySnapshots(); const index = await loadLocalDictionary('/dict/user_dictionary_seed.json'); setDictionaryIndex(index); setActiveDictionary('seed'); setMetas([]); setStorageStatus('cleared'); setStorageMessage('All saved dictionaries cleared. Using seed dictionary.'); setSentenceMatches([]); setScanStatus('not run'); setIsLoadingIndex(false); }
  function handleScanSentence() { if (!dictionaryIndex || !currentData?.plainText || isLoadingIndex) return; setScanStatus('scanning'); const matches = getLongestDictionaryMatches(dictionaryIndex, currentData.plainText, { maxChars: 24 }); setSentenceMatches(matches); setScanStatus(`found ${matches.length}`); }

  const dictionaryFormResult = useMemo(() => {
    if (!dictionaryIndex || !selectedText) return null;
    return lookupWithDictionaryForms(dictionaryIndex, selectedText, currentData || {});
  }, [dictionaryIndex, selectedText, currentData]);
  const exactMatches = useMemo(() => dictionaryIndex && selectedText ? lookupExact(dictionaryIndex, selectedText) : [], [dictionaryIndex, selectedText]);
  const effectiveMatches = exactMatches.length > 0 ? exactMatches : (dictionaryFormResult?.matches || []);
  const effectiveEvidenceText = exactMatches.length > 0 ? selectedText : (dictionaryFormResult?.matchedText || selectedText);
  const metaSummary = useMemo(() => summarizeMetas(metas), [metas]);
  const nextPriority = metas.length + 1;

  return <details open><summary>Dictionary Detection</summary>
    <div className="debug-summary-grid"><MiniCard label="Active index" value={activeDictionary}/><MiniCard label="Storage" value={storageStatus}/><MiniCard label="Saved dictionaries" value={metas.length}/><MiniCard label="Runtime entries" value={dictionaryIndex?.entryCount ?? dictionaryIndex?.entries?.length ?? '-'}/><MiniCard label="Evidence matches" value={effectiveMatches.length}/><MiniCard label="Sentence scan" value={scanStatus}/></div>
    {storageMessage && <div className="debug-empty">{storageMessage}</div>}
    {loadError && <details className="debug-nested" open><summary>load error</summary><pre>{loadError}</pre></details>}
    <details className="debug-nested" open><summary>saved dictionary coverage from metadata</summary><div className="debug-summary-grid"><MiniCard label="Saved entries" value={metaSummary.totalEntries}/><MiniCard label="Term dicts" value={metaSummary.term.dicts}/><MiniCard label="Expression dicts" value={metaSummary.expression.dicts}/><MiniCard label="Name dicts" value={metaSummary.name.dicts}/><MiniCard label="Grammar dicts" value={metaSummary.grammar.dicts}/></div></details>
    {selectedText && (
      <details className="debug-nested" open>
        <summary>evidence lookup result</summary>
        <div className="debug-summary-grid">
          <MiniCard label="Selected surface" value={selectedText} />
          <MiniCard label="Evidence headword" value={effectiveEvidenceText || '-'} />
          <MiniCard label="Matched by" value={exactMatches.length > 0 ? 'surface' : (dictionaryFormResult?.matchedBy || 'none')} />
          <MiniCard label="Evidence matches" value={effectiveMatches.length} />
        </div>
        <div className="debug-empty">{exactMatches.length > 0 ? 'Exact selected-surface evidence used.' : (dictionaryFormResult?.matchDetail || 'No dictionary-form evidence found.')}</div>
        {dictionaryFormResult?.attempts?.length > 0 && (
          <details className="debug-nested">
            <summary>lookup attempts ({dictionaryFormResult.attempts.length})</summary>
            <div className="debug-token-list">
              {dictionaryFormResult.attempts.slice(0, 20).map((attempt, index) => (
                <div className="debug-token-row" key={`${attempt.method}-${attempt.text}-${index}`}>
                  <div className="debug-token-main"><strong>{attempt.text}</strong><span>{attempt.matches.length} match(es)</span></div>
                  <div className="debug-token-meta"><span>{attempt.method}</span><span>{attempt.detail || '-'}</span></div>
                </div>
              ))}
            </div>
          </details>
        )}
      </details>
    )}
    <EvidencePreview selectedText={effectiveEvidenceText} entries={effectiveMatches}/>
    <ComponentPreview dictionaryIndex={dictionaryIndex} selectedText={selectedText}/>
    <QASearchPanel dictionaryIndex={dictionaryIndex}/>
    <div className="dictionary-import-row"><button type="button" className="secondary" onClick={handleLoadAll} disabled={isLoadingIndex}>Load all dictionaries safely</button>{isLoadingIndex && <button type="button" className="secondary" onClick={handleCancelLoad}>Cancel load</button>}<button type="button" className="secondary" onClick={handleScanSentence} disabled={!dictionaryIndex || !currentData?.plainText || isLoadingIndex}>Scan current sentence</button><button type="button" className="secondary" onClick={() => { setSentenceMatches([]); setScanStatus('not run'); }}>Clear scan</button><button type="button" className="secondary" onClick={handleClearAll}>Clear all dictionaries</button></div>
    <DictionaryList metas={metas} onDelete={handleDelete}/>
    <ProfileSummary profile={latestProfile}/>
    {sentenceMatches.length > 0 && <details className="debug-nested" open><summary>Sentence dictionary spans ({sentenceMatches.length})</summary><div className="debug-token-list dictionary-debug-match-list">{sentenceMatches.slice(0, 10).map((match, index) => { const grouped = groupDictionaryEvidence(match.entries || []); return <div className="debug-token-row" key={`${match.start}-${match.end}-${match.term}-${index}`}><div className="debug-token-main"><span className="debug-token-index">#{index + 1}</span><strong>{match.term}</strong><span>{match.start}-{match.end}</span></div><div className="debug-token-meta"><span>length: {match.length}</span><span>entries: {match.entries?.length || 0}</span><span>name: {grouped.name.length}</span><span>grammar: {grouped.grammar.length}</span><span>expression: {grouped.expression.length}</span><span>term: {grouped.term.length}</span><span>top: {match.entries?.[0]?.sourceDictionary || '-'}</span></div></div>; })}</div>{sentenceMatches.length > 10 && <div className="debug-empty">Showing first 10 only.</div>}</details>}
    <Phase8DictionarySyncPanel/><AnalyzerDictionaryValidationPreview dictionaryIndex={dictionaryIndex} currentData={currentData} isLoadingIndex={isLoadingIndex}/><MiningWordAnalysisPreview dictionaryIndex={dictionaryIndex} currentData={currentData}/><Importer nextPriority={nextPriority} onDictionaryImported={handleDictionaryImported} onProfileInspected={setLatestProfile}/>
  </details>;
}
