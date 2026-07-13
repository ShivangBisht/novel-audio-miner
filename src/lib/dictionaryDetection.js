export const DICTIONARY_TYPES = {
  TERM: 'term',
  EXPRESSION: 'expression',
  NAME: 'name',
  GRAMMAR: 'grammar',
  FREQUENCY: 'frequency',
  KANJI: 'kanji',
  PITCH: 'pitch',
  UNKNOWN: 'unknown'
};

export const ADAPTERS = {
  YOMITAN_TERM_V3: 'yomitan-term-v3',
  YOMITAN_EXPRESSION_V3: 'yomitan-expression-v3',
  YOMITAN_NAME_V3: 'yomitan-name-v3',
  YOMITAN_GRAMMAR_V3: 'yomitan-grammar-v3',
  UNSUPPORTED: 'unsupported'
};

const CLASSIFIABLE_TYPES = [
  DICTIONARY_TYPES.TERM,
  DICTIONARY_TYPES.EXPRESSION,
  DICTIONARY_TYPES.NAME,
  DICTIONARY_TYPES.GRAMMAR,
  DICTIONARY_TYPES.FREQUENCY,
  DICTIONARY_TYPES.KANJI,
  DICTIONARY_TYPES.PITCH
];

export function normalizeText(value) {
  return String(value || '').normalize('NFKC').trim();
}

export function createDictionaryId(title = 'dictionary', fileName = '') {
  const base = normalizeText(title || fileName || 'dictionary')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'dictionary';
  return `${base}-${Date.now()}`;
}

function addEvidence(state, type, points, reason, source = 'content') {
  if (!state.scores[type]) state.scores[type] = 0;
  state.scores[type] += points;
  state.evidence.push({ type, points, reason, source });
}

function textIncludesAny(text, needles) {
  const value = normalizeText(text).toLowerCase();
  return needles.some(needle => value.includes(String(needle).toLowerCase()));
}

function flattenGlossaryText(value, depth = 0) {
  if (depth > 4 || value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(item => flattenGlossaryText(item, depth + 1)).join(' ');
  if (typeof value === 'object') return Object.values(value).map(item => flattenGlossaryText(item, depth + 1)).join(' ');
  return '';
}

export function detectYomitanTermRowShape(row) {
  if (!Array.isArray(row)) return { supported: false, reason: 'Row is not an array.' };
  if (row.length < 6) return { supported: false, reason: `Row has ${row.length} columns; expected at least 6.` };
  if (typeof row[0] !== 'string') return { supported: false, reason: 'Column 0 is not a string expression.' };
  if (!Array.isArray(row[5])) return { supported: false, reason: 'Column 5 is not glossary/readings array.' };
  return {
    supported: true,
    reason: 'Looks like a Yomitan term_bank row.',
    length: row.length,
    columns: row.map(value => Array.isArray(value)
      ? `array(${value.length})`
      : value && typeof value === 'object' ? 'object' : typeof value)
  };
}

function analyzeSampleRows(sampleRows = []) {
  const termRows = sampleRows
    .filter(item => item?.type === 'term_bank' && Array.isArray(item.row))
    .map(item => item.row)
    .slice(0, 100);

  const metrics = {
    sampledTermRows: termRows.length,
    validTermRows: 0,
    nameTaggedRows: 0,
    grammarTaggedRows: 0,
    expressionTaggedRows: 0,
    grammarPatternRows: 0,
    multiwordRows: 0,
    singleCharacterRows: 0,
    metadataLikeRows: 0
  };

  const nameTagPattern = /(?:surname|given|masc|fem|person|place|station|company|organization|product|work|unclass|名|姓|地名|人名)/i;
  const grammarTagPattern = /(?:grammar|文法|文型|助詞|助動詞|接続|bunpro|dojg)/i;
  const expressionTagPattern = /(?:expression|表現|慣用|成句|連語|idiom|phrase)/i;
  const grammarHeadwordPattern = /[〜～~]|(?:こと|もの|わけ|はず|よう|ため|ところ|うち|まま|つもり|によって|に対して|に関して|として|てしまう|なければ|ではない|のでは|という)$/;

  for (const row of termRows) {
    const shape = detectYomitanTermRowShape(row);
    if (!shape.supported) continue;
    metrics.validTermRows += 1;
    const expression = normalizeText(row[0]);
    const tags = `${row[2] || ''} ${row[7] || ''}`;
    const glossary = flattenGlossaryText(row[5]);
    const combined = `${tags} ${glossary}`;

    if (nameTagPattern.test(tags)) metrics.nameTaggedRows += 1;
    if (grammarTagPattern.test(combined)) metrics.grammarTaggedRows += 1;
    if (expressionTagPattern.test(combined)) metrics.expressionTaggedRows += 1;
    if (grammarHeadwordPattern.test(expression)) metrics.grammarPatternRows += 1;
    if (/\s/.test(expression) || expression.length >= 5) metrics.multiwordRows += 1;
    if (expression.length === 1) metrics.singleCharacterRows += 1;
    if (row.length <= 4 || (typeof row[2] === 'number' && typeof row[3] !== 'string')) metrics.metadataLikeRows += 1;
  }

  return metrics;
}

function rankScores(scores) {
  return CLASSIFIABLE_TYPES
    .map(type => ({ type, score: Number(scores[type] || 0) }))
    .sort((a, b) => b.score - a.score);
}

function getConfidence(ranked, sampleCount) {
  const top = ranked[0] || { score: 0 };
  const second = ranked[1] || { score: 0 };
  const margin = top.score - second.score;
  if (top.score >= 110 && margin >= 35 && sampleCount >= 5) return 'high';
  if (top.score >= 70 && margin >= 15) return 'medium';
  return 'low';
}

function adapterForType(type) {
  if (type === DICTIONARY_TYPES.TERM) return ADAPTERS.YOMITAN_TERM_V3;
  if (type === DICTIONARY_TYPES.EXPRESSION) return ADAPTERS.YOMITAN_EXPRESSION_V3;
  if (type === DICTIONARY_TYPES.NAME) return ADAPTERS.YOMITAN_NAME_V3;
  if (type === DICTIONARY_TYPES.GRAMMAR) return ADAPTERS.YOMITAN_GRAMMAR_V3;
  return ADAPTERS.UNSUPPORTED;
}

export function classifyDictionaryEvidence(summary = {}, sampleRows = []) {
  const state = {
    scores: Object.fromEntries(CLASSIFIABLE_TYPES.map(type => [type, 0])),
    evidence: []
  };

  const termBankFiles = summary.termBankFiles?.length || 0;
  const termMetaBankFiles = summary.termMetaBankFiles?.length || 0;
  const kanjiBankFiles = summary.kanjiBankFiles?.length || 0;
  const metadataText = [
    summary.index?.title,
    summary.index?.description,
    summary.index?.author,
    summary.index?.revision,
    summary.fileName
  ].filter(Boolean).join(' ');

  // Structural evidence has the highest reliability.
  if (termBankFiles > 0) addEvidence(state, DICTIONARY_TYPES.TERM, 60, `${termBankFiles} term_bank file(s) found.`, 'structure');
  if (kanjiBankFiles > 0) addEvidence(state, DICTIONARY_TYPES.KANJI, termBankFiles > 0 ? 80 : 170, `${kanjiBankFiles} kanji_bank file(s) found.`, 'structure');
  if (termMetaBankFiles > 0) {
    if (termBankFiles === 0) addEvidence(state, DICTIONARY_TYPES.FREQUENCY, 150, 'term_meta_bank files found without term_bank content.', 'structure');
    else addEvidence(state, DICTIONARY_TYPES.FREQUENCY, 15, 'term_meta_bank files coexist with term entries; weak metadata signal only.', 'structure');
  }

  const metrics = analyzeSampleRows(sampleRows);
  if (metrics.validTermRows > 0) addEvidence(state, DICTIONARY_TYPES.TERM, 35, `${metrics.validTermRows}/${metrics.sampledTermRows} sampled rows match Yomitan term schema.`, 'row-shape');

  const denominator = Math.max(metrics.validTermRows, 1);
  const nameRatio = metrics.nameTaggedRows / denominator;
  const grammarRatio = (metrics.grammarTaggedRows + metrics.grammarPatternRows) / denominator;
  const expressionRatio = (metrics.expressionTaggedRows + metrics.multiwordRows * 0.35) / denominator;

  if (metrics.nameTaggedRows >= 3 && nameRatio >= 0.3) addEvidence(state, DICTIONARY_TYPES.NAME, 110, `${metrics.nameTaggedRows}/${denominator} sampled rows contain name-type evidence.`, 'sample-content');
  else if (metrics.nameTaggedRows > 0) addEvidence(state, DICTIONARY_TYPES.NAME, 25, `${metrics.nameTaggedRows} sampled row(s) contain name-type tags.`, 'sample-content');

  if ((metrics.grammarTaggedRows >= 2 || metrics.grammarPatternRows >= 3) && grammarRatio >= 0.25) addEvidence(state, DICTIONARY_TYPES.GRAMMAR, 115, 'Sampled headwords/tags show repeated grammar-pattern evidence.', 'sample-content');
  else if (metrics.grammarTaggedRows || metrics.grammarPatternRows) addEvidence(state, DICTIONARY_TYPES.GRAMMAR, 25, 'Some sampled rows look grammar-related.', 'sample-content');

  if ((metrics.expressionTaggedRows >= 2 || metrics.multiwordRows >= 4) && expressionRatio >= 0.3) addEvidence(state, DICTIONARY_TYPES.EXPRESSION, 105, 'Sampled entries show repeated fixed-expression/phrase evidence.', 'sample-content');
  else if (metrics.expressionTaggedRows || metrics.multiwordRows) addEvidence(state, DICTIONARY_TYPES.EXPRESSION, 18, 'Some sampled entries look expression-like.', 'sample-content');

  // Metadata is a supporting hint, never sufficient to override contradictory bank structure by itself.
  if (textIncludesAny(metadataText, ['jmnedict', 'proper name', 'proper names', '人名辞典', '姓名'])) addEvidence(state, DICTIONARY_TYPES.NAME, 55, 'Metadata suggests a proper-name dictionary.', 'metadata');
  if (textIncludesAny(metadataText, ['bunpro', 'dojg', 'grammar dictionary', '文法辞典', '文型辞典', '文法', '文型'])) addEvidence(state, DICTIONARY_TYPES.GRAMMAR, 55, 'Metadata suggests a grammar dictionary.', 'metadata');
  if (textIncludesAny(metadataText, ['expression dictionary', '表現辞典', '実用日本語表現', '慣用句辞典', 'idiom dictionary'])) addEvidence(state, DICTIONARY_TYPES.EXPRESSION, 55, 'Metadata suggests an expression dictionary.', 'metadata');
  if (textIncludesAny(metadataText, ['frequency dictionary', 'frequency list', 'frequency rank', '頻度辞典', '頻度リスト'])) addEvidence(state, DICTIONARY_TYPES.FREQUENCY, 45, 'Metadata explicitly describes a frequency resource.', 'metadata');
  if (textIncludesAny(metadataText, ['pitch accent', 'アクセント辞典', '発音アクセント'])) addEvidence(state, DICTIONARY_TYPES.PITCH, 85, 'Metadata explicitly describes pitch-accent data.', 'metadata');
  if (textIncludesAny(metadataText, ['kanjidic', 'kanji dictionary', '漢字辞典'])) addEvidence(state, DICTIONARY_TYPES.KANJI, 55, 'Metadata explicitly describes a kanji dictionary.', 'metadata');

  // Prevent normal term dictionaries from being misclassified by a weak metadata word.
  if (termBankFiles > 0 && kanjiBankFiles === 0) addEvidence(state, DICTIONARY_TYPES.TERM, 20, 'Term banks are present and no kanji_bank files exist.', 'structure');
  if (termBankFiles > 0 && termMetaBankFiles === 0) addEvidence(state, DICTIONARY_TYPES.TERM, 15, 'Term content exists without metadata-only bank structure.', 'structure');

  const ranked = rankScores(state.scores);
  let detectedType = ranked[0]?.type || DICTIONARY_TYPES.UNKNOWN;
  const confidence = getConfidence(ranked, metrics.sampledTermRows);

  if ((ranked[0]?.score || 0) < 35) detectedType = DICTIONARY_TYPES.UNKNOWN;

  const supported = [
    DICTIONARY_TYPES.TERM,
    DICTIONARY_TYPES.EXPRESSION,
    DICTIONARY_TYPES.NAME,
    DICTIONARY_TYPES.GRAMMAR
  ].includes(detectedType) && confidence !== 'low';

  const adapter = supported ? adapterForType(detectedType) : ADAPTERS.UNSUPPORTED;
  const top = ranked[0] || { type: DICTIONARY_TYPES.UNKNOWN, score: 0 };
  const second = ranked[1] || { type: DICTIONARY_TYPES.UNKNOWN, score: 0 };
  const reason = detectedType === DICTIONARY_TYPES.UNKNOWN
    ? 'Insufficient structural/content evidence to classify safely.'
    : `${detectedType} scored ${top.score}; next candidate ${second.type} scored ${second.score}.`;

  return {
    type: detectedType,
    supported,
    adapter,
    confidence,
    reason,
    scores: state.scores,
    rankedScores: ranked,
    evidence: state.evidence.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    metrics
  };
}

export function detectDictionaryType(summary = {}, sampleRows = []) {
  return classifyDictionaryEvidence(summary, sampleRows);
}

function baseRow(row, dictionaryTitle, priority, dictionaryId, type, adapter) {
  const shape = detectYomitanTermRowShape(row);
  if (!shape.supported) return null;
  const text = normalizeText(row[0]);
  if (!text) return null;
  const tags = typeof row[2] === 'string' ? row[2].split(' ').filter(Boolean) : [];
  return { text, reading: normalizeText(row[1]), type, sourceDictionary: dictionaryTitle, dictionaryId, tags, rules: row[3] || '', score: Number(row[4] || 0), sequence: row[6] ?? null, termTags: row[7] || '', priority, confidence: 'dictionary', adapter };
}

function inferNameType(tags = []) {
  const joined = Array.isArray(tags) ? tags.join(' ') : String(tags || '');
  if (/place|station|company|organization|product|work/i.test(joined)) return 'place-or-organization';
  if (/surname|given|masc|fem|person/i.test(joined)) return 'person';
  if (/unclass/i.test(joined)) return 'unclassified-name';
  return 'name';
}

function inferGrammarType(dictionaryTitle = '', termTags = '', tags = []) {
  const haystack = `${dictionaryTitle} ${termTags} ${Array.isArray(tags) ? tags.join(' ') : tags}`.toLowerCase();
  if (haystack.includes('bunpro')) return 'bunpro-grammar-point';
  if (haystack.includes('dojg') || haystack.includes('文法辞典')) return 'dojg-grammar-item';
  if (haystack.includes('文型') || haystack.includes('grammar') || haystack.includes('handbook')) return 'grammar-pattern';
  return 'grammar-expression';
}

export function normalizeYomitanTermRow(row, dictionaryTitle = 'dictionary', priority = 1, dictionaryId = '') { return baseRow(row, dictionaryTitle, priority, dictionaryId, DICTIONARY_TYPES.TERM, ADAPTERS.YOMITAN_TERM_V3); }
export function normalizeYomitanExpressionRow(row, dictionaryTitle = 'dictionary', priority = 1, dictionaryId = '') { const entry = baseRow(row, dictionaryTitle, priority, dictionaryId, DICTIONARY_TYPES.EXPRESSION, ADAPTERS.YOMITAN_EXPRESSION_V3); return entry ? { ...entry, expressionType: 'practical-expression' } : null; }
export function normalizeYomitanNameRow(row, dictionaryTitle = 'dictionary', priority = 1, dictionaryId = '') { const entry = baseRow(row, dictionaryTitle, priority, dictionaryId, DICTIONARY_TYPES.NAME, ADAPTERS.YOMITAN_NAME_V3); if (!entry) return null; const readings = Array.isArray(row[5]) ? row[5].map(normalizeText).filter(Boolean) : []; return { ...entry, reading: entry.reading || readings[0] || '', readings, nameType: inferNameType(entry.tags) }; }
export function normalizeYomitanGrammarRow(row, dictionaryTitle = 'dictionary', priority = 1, dictionaryId = '') { const entry = baseRow(row, dictionaryTitle, priority, dictionaryId, DICTIONARY_TYPES.GRAMMAR, ADAPTERS.YOMITAN_GRAMMAR_V3); return entry ? { ...entry, grammarType: inferGrammarType(dictionaryTitle, entry.termTags, entry.tags) } : null; }

function normalizeRows(rows, fn, dictionaryTitle, priority, dictionaryId, limit = Infinity) {
  const output = [];
  for (const row of rows || []) {
    const item = fn(row, dictionaryTitle, priority, dictionaryId);
    if (item) output.push(item);
    if (output.length >= limit) break;
  }
  return output;
}

export function normalizeYomitanTermRows(rows = [], dictionaryTitle = 'dictionary', priority = 1, dictionaryId = '', limit = Infinity) { return normalizeRows(rows, normalizeYomitanTermRow, dictionaryTitle, priority, dictionaryId, limit); }
export function normalizeYomitanExpressionRows(rows = [], dictionaryTitle = 'dictionary', priority = 1, dictionaryId = '', limit = Infinity) { return normalizeRows(rows, normalizeYomitanExpressionRow, dictionaryTitle, priority, dictionaryId, limit); }
export function normalizeYomitanNameRows(rows = [], dictionaryTitle = 'dictionary', priority = 1, dictionaryId = '', limit = Infinity) { return normalizeRows(rows, normalizeYomitanNameRow, dictionaryTitle, priority, dictionaryId, limit); }
export function normalizeYomitanGrammarRows(rows = [], dictionaryTitle = 'dictionary', priority = 1, dictionaryId = '', limit = Infinity) { return normalizeRows(rows, normalizeYomitanGrammarRow, dictionaryTitle, priority, dictionaryId, limit); }

export function createDictionaryProfile(summary = {}, sampleRows = [], priority = 1) {
  const title = summary.index?.title || summary.index?.name || summary.fileName || 'Dictionary';
  const detected = classifyDictionaryEvidence(summary, sampleRows);
  const sampleTermRows = sampleRows.filter(item => item?.type === 'term_bank').map(item => item.row);
  const dictionaryId = summary.dictionaryId || createDictionaryId(title, summary.fileName || '');
  const sampleNormalizedEntries = detected.supported && detected.adapter === ADAPTERS.YOMITAN_TERM_V3
    ? normalizeYomitanTermRows(sampleTermRows, title, priority, dictionaryId, 5)
    : detected.supported && detected.adapter === ADAPTERS.YOMITAN_EXPRESSION_V3
      ? normalizeYomitanExpressionRows(sampleTermRows, title, priority, dictionaryId, 5)
      : detected.supported && detected.adapter === ADAPTERS.YOMITAN_NAME_V3
        ? normalizeYomitanNameRows(sampleTermRows, title, priority, dictionaryId, 5)
        : detected.supported && detected.adapter === ADAPTERS.YOMITAN_GRAMMAR_V3
          ? normalizeYomitanGrammarRows(sampleTermRows, title, priority, dictionaryId, 5)
          : [];

  return {
    id: dictionaryId,
    title,
    fileName: summary.fileName || '',
    format: summary.index?.format || null,
    revision: summary.index?.revision || '',
    detectedType: detected.type,
    supported: detected.supported,
    adapter: detected.adapter,
    confidence: detected.confidence,
    reason: detected.reason,
    scores: detected.scores,
    rankedScores: detected.rankedScores,
    categoryEvidence: detected.evidence,
    sampleMetrics: detected.metrics,
    priority,
    termBankFiles: summary.termBankFiles?.length || 0,
    termMetaBankFiles: summary.termMetaBankFiles?.length || 0,
    tagBankFiles: summary.tagBankFiles?.length || 0,
    kanjiBankFiles: summary.kanjiBankFiles?.length || 0,
    estimatedRowsByType: summary.estimatedRowsByType || {},
    rowShape: sampleTermRows[0] ? detectYomitanTermRowShape(sampleTermRows[0]) : null,
    sampleNormalizedEntries
  };
}
