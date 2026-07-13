export function normalizeDictionaryText(value) { return String(value || '').normalize('NFKC').trim(); }
function normalizeDefinitions(value) { if (!value) return []; if (Array.isArray(value)) return value; return [value]; }
function tagsFrom(value) { return Array.isArray(value) ? value : typeof value === 'string' ? value.split(' ').filter(Boolean) : []; }
function inferNameType(tags = []) { const s = Array.isArray(tags) ? tags.join(' ') : String(tags || ''); if (/place|station|company|organization|product|work/i.test(s)) return 'place-or-organization'; if (/surname|given|masc|fem|person/i.test(s)) return 'person'; if (/unclass/i.test(s)) return 'unclassified-name'; return 'name'; }
function inferGrammarType(title = '', termTags = '', tags = []) { const s = `${title} ${termTags} ${Array.isArray(tags) ? tags.join(' ') : tags}`.toLowerCase(); if (s.includes('bunpro')) return 'bunpro-grammar-point'; if (s.includes('dojg') || s.includes('文法辞典')) return 'dojg-grammar-item'; if (s.includes('文型') || s.includes('grammar') || s.includes('handbook')) return 'grammar-pattern'; return 'grammar-expression'; }

export function normalizeDictionaryEntry(rawEntry, fallbackSource = 'unknown') {
  const term = normalizeDictionaryText(rawEntry.term || rawEntry.expression || rawEntry.text || rawEntry[0]);
  if (!term) return null;
  const reading = normalizeDictionaryText(rawEntry.reading || rawEntry.kana || rawEntry[1]);
  const source = normalizeDictionaryText(rawEntry.source || rawEntry.sourceDictionary || fallbackSource || 'unknown');
  return { term, reading, source, sourceDictionary: rawEntry.sourceDictionary || source, dictionaryId: rawEntry.dictionaryId || '', dictionaryPriority: Number(rawEntry.dictionaryPriority ?? rawEntry.priority ?? 9999), tags: tagsFrom(rawEntry.tags), rules: rawEntry.rules || '', score: Number(rawEntry.score || rawEntry.popularity || 0), definitions: normalizeDefinitions(rawEntry.definitions || rawEntry.glossary || rawEntry[5]), sequence: rawEntry.sequence ?? rawEntry.seq ?? rawEntry[6] ?? null, termTags: rawEntry.termTags || rawEntry[7] || '', dictionaryType: rawEntry.dictionaryType || rawEntry.type || 'term', nameType: rawEntry.nameType || '', grammarType: rawEntry.grammarType || '', expressionType: rawEntry.expressionType || '', readings: Array.isArray(rawEntry.readings) ? rawEntry.readings : [], raw: rawEntry.raw || rawEntry };
}

function convertRow(row, dictionaryTitle, dictionaryId, dictionaryPriority, dictionaryType) {
  if (!Array.isArray(row)) return null;
  const tags = tagsFrom(row[2]);
  const readings = Array.isArray(row[5]) ? row[5].map(normalizeDictionaryText).filter(Boolean) : [];
  const extra = dictionaryType === 'name' ? { nameType: inferNameType(tags), readings, definitions: readings }
    : dictionaryType === 'grammar' ? { grammarType: inferGrammarType(dictionaryTitle, row[7] || '', tags) }
      : dictionaryType === 'expression' ? { expressionType: 'practical-expression' }
        : {};
  return normalizeDictionaryEntry({ term: row[0], reading: row[1] || (dictionaryType === 'name' ? readings[0] : '') || '', tags, rules: row[3] || '', score: Number(row[4] || 0), definitions: Array.isArray(row[5]) ? row[5] : row[5] ? [row[5]] : [], sequence: row[6] ?? null, termTags: row[7] || '', source: dictionaryTitle, sourceDictionary: dictionaryTitle, dictionaryId, dictionaryPriority, dictionaryType, raw: row, ...extra }, dictionaryTitle);
}
export function convertYomitanTermBankRow(row, dictionaryTitle = 'yomitan-import', dictionaryId = '', dictionaryPriority = 9999) { return convertRow(row, dictionaryTitle, dictionaryId, dictionaryPriority, 'term'); }
export function convertYomitanExpressionBankRow(row, dictionaryTitle = 'yomitan-expression-import', dictionaryId = '', dictionaryPriority = 9999) { return convertRow(row, dictionaryTitle, dictionaryId, dictionaryPriority, 'expression'); }
export function convertYomitanNameBankRow(row, dictionaryTitle = 'yomitan-name-import', dictionaryId = '', dictionaryPriority = 9999) { return convertRow(row, dictionaryTitle, dictionaryId, dictionaryPriority, 'name'); }
export function convertYomitanGrammarBankRow(row, dictionaryTitle = 'yomitan-grammar-import', dictionaryId = '', dictionaryPriority = 9999) { return convertRow(row, dictionaryTitle, dictionaryId, dictionaryPriority, 'grammar'); }
export function convertYomitanTermBankRows(rows = [], dictionaryTitle = 'yomitan-import', dictionaryId = '', dictionaryPriority = 9999) { return rows.map(row => convertYomitanTermBankRow(row, dictionaryTitle, dictionaryId, dictionaryPriority)).filter(Boolean); }
export function convertYomitanExpressionBankRows(rows = [], dictionaryTitle = 'yomitan-expression-import', dictionaryId = '', dictionaryPriority = 9999) { return rows.map(row => convertYomitanExpressionBankRow(row, dictionaryTitle, dictionaryId, dictionaryPriority)).filter(Boolean); }
export function convertYomitanNameBankRows(rows = [], dictionaryTitle = 'yomitan-name-import', dictionaryId = '', dictionaryPriority = 9999) { return rows.map(row => convertYomitanNameBankRow(row, dictionaryTitle, dictionaryId, dictionaryPriority)).filter(Boolean); }
export function convertYomitanGrammarBankRows(rows = [], dictionaryTitle = 'yomitan-grammar-import', dictionaryId = '', dictionaryPriority = 9999) { return rows.map(row => convertYomitanGrammarBankRow(row, dictionaryTitle, dictionaryId, dictionaryPriority)).filter(Boolean); }

export function buildDictionaryIndex(entries = []) {
  const index = { entries: [], byTerm: new Map(), byFirstChar: new Map(), sources: new Set(), builtAt: new Date().toISOString() };
  const normalizedEntries = entries.map(entry => entry?.term ? normalizeDictionaryEntry(entry, entry.source || entry.sourceDictionary || 'imported') : entry).filter(entry => entry?.term).sort((a,b)=>(a.dictionaryPriority??9999)-(b.dictionaryPriority??9999)||b.score-a.score);
  for (const entry of normalizedEntries) { index.entries.push(entry); index.sources.add(entry.source || entry.sourceDictionary || 'unknown'); if (!index.byTerm.has(entry.term)) index.byTerm.set(entry.term, []); index.byTerm.get(entry.term).push(entry); const c = entry.term[0]; if (!index.byFirstChar.has(c)) index.byFirstChar.set(c, []); index.byFirstChar.get(c).push(entry); }
  for (const bucket of index.byFirstChar.values()) bucket.sort((a,b)=>b.term.length-a.term.length||(a.dictionaryPriority??9999)-(b.dictionaryPriority??9999)||b.score-a.score);
  return index;
}
export async function loadLocalDictionary(url = '/dict/user_dictionary_seed.json') { const res = await fetch(url); if (!res.ok) throw new Error(`Dictionary load failed: ${url} HTTP ${res.status}`); const data = await res.json(); const source = data.title || data.source || 'local-dictionary'; const entries = (data.entries || []).map(entry => normalizeDictionaryEntry({ ...entry, source: entry.source || source, sourceDictionary: entry.source || source, dictionaryPriority: 9999 }, source)).filter(Boolean); return buildDictionaryIndex(entries); }
export function lookupExact(index, text) { const term = normalizeDictionaryText(text); if (!term || !index?.byTerm) return []; return index.byTerm.get(term) || []; }
export function findPrefixMatches(index, text, startIndex = 0, options = {}) { const maxChars = options.maxChars || 24; const src = String(text || ''); const first = src[startIndex]; if (!first || !index?.byFirstChar?.has(first)) return []; const slice = src.slice(startIndex, startIndex + maxChars); const matches = []; for (const entry of index.byFirstChar.get(first)) if (slice.startsWith(entry.term)) matches.push({ term: entry.term, start: startIndex, end: startIndex + entry.term.length, length: entry.term.length, entries: lookupExact(index, entry.term) }); return matches.sort((a,b)=>b.length-a.length||b.entries.length-a.entries.length); }
export function findSentenceDictionaryMatches(index, text, options = {}) { const src = String(text || ''); const matches = []; for (let i=0;i<src.length;i+=1) matches.push(...findPrefixMatches(index, src, i, options)); return matches; }
export function getLongestDictionaryMatches(index, text, options = {}) { const all = findSentenceDictionaryMatches(index, text, options); const occupied = new Set(); const selected = []; for (const m of all.sort((a,b)=>b.length-a.length||a.start-b.start)) { let overlap=false; for(let i=m.start;i<m.end;i+=1) if(occupied.has(i)){overlap=true;break;} if(overlap) continue; selected.push(m); for(let i=m.start;i<m.end;i+=1) occupied.add(i); } return selected.sort((a,b)=>a.start-b.start); }

function compactAnalysisText(value) {
  return normalizeDictionaryText(value).replace(/[\s\u3000]+/g, '');
}

function analysisTokenSurface(token) {
  return compactAnalysisText(token?.surface || token?.text || '');
}

function analysisTokenLemma(token) {
  const value = token?.dictionaryForm || token?.basicForm || token?.baseForm || token?.lemma || token?.surface || '';
  return value && value !== '*' ? compactAnalysisText(value) : analysisTokenSurface(token);
}

function analysisTokenPos(token) {
  return [token?.pos, token?.posDetail1, token?.posDetail2, token?.posDetail3, token?.tokenCategory]
    .filter(Boolean).join(' ').toLowerCase();
}

function isPunctuationToken(token) {
  return /^[。、！？!?「」『』（）()［］\[\]…・：:；;]+$/.test(analysisTokenSurface(token)) || /記号|symbol|punct/.test(analysisTokenPos(token));
}

function isParticleToken(token) {
  return /助詞|particle/.test(analysisTokenPos(token)) || /^(?:は|が|を|に|へ|で|と|の|も|や|か|ね|よ|ぞ|さ|から|まで|より)$/.test(analysisTokenSurface(token));
}

function isDependentLexicalVerb(token) {
  const pos = analysisTokenPos(token);
  const lemma = analysisTokenLemma(token);
  if (!/動詞|verb/.test(pos) || !/非自立|補助/.test(pos)) return false;
  // These productive verbs can form compound mining words and can also be valid
  // standalone lemmas. They must not be discarded as generic grammar.
  return /(?:始める|続ける|終わる|終える|かける|直す|切る|込む|出す|合う|過ぎる|忘れる)$/.test(lemma);
}

function isAuxiliaryVerbToken(token) {
  const lemma = analysisTokenLemma(token);
  const pos = analysisTokenPos(token);
  if (!/動詞|verb/.test(pos) || !/非自立|補助/.test(pos)) return false;
  return /^(?:いる|ある|おく|みる|しまう|いく|くる|くださる|もらう|いただく)$/.test(lemma);
}

function isAuxiliaryToken(token) {
  const surface = analysisTokenSurface(token);
  const pos = analysisTokenPos(token);
  if (/助動詞|auxiliary/.test(pos)) return true;
  if (isAuxiliaryVerbToken(token)) return true;
  return /^(?:た|だ|いる|いた|いない|ある|あった|ない|なかった|ます|ました|ません|たい|たく|られる|れる|させる|せる|ん)$/.test(surface);
}

function isLexicalToken(token) {
  const pos = analysisTokenPos(token);
  if (isPunctuationToken(token) || isParticleToken(token) || isAuxiliaryToken(token)) return false;
  if (isDependentLexicalVerb(token)) return true;
  if (/動詞|形容詞|形状詞|名詞|代名詞|固有名詞|verb|adjective|noun|pronoun|proper/.test(pos)) return true;
  return /[一-龯々ァ-ヶぁ-ん]/.test(analysisTokenSurface(token));
}

function isConjunctiveParticleToken(token) {
  const surface = analysisTokenSurface(token);
  const pos = analysisTokenPos(token);
  // Only tokenizer-confirmed conjunctive て/で can bridge a lexical verb to
  // following aspect/auxiliary material. Case-particle で is a hard boundary.
  return /^(?:て|で)$/.test(surface) && /助詞/.test(pos) && /接続助詞/.test(pos);
}

function isConjugationBridge(token) {
  return isAuxiliaryToken(token) || isConjunctiveParticleToken(token);
}

function isHardBoundaryParticle(token) {
  return isParticleToken(token) && !isConjunctiveParticleToken(token);
}

function isCopulaToken(token) {
  return isAuxiliaryToken(token) && analysisTokenLemma(token) === 'だ';
}
function isNominalLexicalToken(token) {
  const pos = analysisTokenPos(token);
  return /名詞|形容動詞語幹|形状詞|noun|na-adjective/.test(pos) && !/(?:^| )動詞(?: |$)|(?:^| )verb(?: |$)/.test(pos);
}
function shouldAttachConjugationBridge(headToken, bridgeToken) {
  if (isCopulaToken(bridgeToken) && isNominalLexicalToken(headToken)) return false;
  return isConjugationBridge(bridgeToken);
}
function isExpressiveSokuonToken(token) { return analysisTokenSurface(token) === 'っ'; }

function selectTokenSource(currentData = {}) {
  const sources = [currentData.classifiedWords, currentData.displayWords, currentData.contentWords, currentData.tokens];
  return sources.find(source => Array.isArray(source) && source.some(token => analysisTokenSurface(token))) || [];
}

function evidenceCounts(entries = []) {
  const counts = { term: 0, expression: 0, grammar: 0, name: 0 };
  const sources = { term: new Set(), expression: new Set(), grammar: new Set(), name: new Set() };
  for (const entry of entries || []) {
    const type = ['term', 'expression', 'grammar', 'name'].includes(entry?.dictionaryType || entry?.type)
      ? (entry.dictionaryType || entry.type) : 'term';
    counts[type] += 1;
    sources[type].add(entry.sourceDictionary || entry.source || entry.dictionaryId || 'unknown');
  }
  return {
    counts,
    sourceCounts: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, value.size]))
  };
}

function categoryFromEvidence(surface, tokens, entries) {
  const { counts, sourceCounts } = evidenceCounts(entries);
  const pos = tokens.map(analysisTokenPos).join(' ');
  const multiToken = tokens.length > 1;
  const hasParticle = tokens.some(isParticleToken);
  const tokenizerProper = /固有名詞|proper/.test(pos);
  const tokenizerPronoun = /代名詞|pronoun/.test(pos);
  const tokenizerGrammar = tokens.every(token => isParticleToken(token) || isAuxiliaryToken(token));

  if (tokens.every(isPunctuationToken)) return { category: 'ignored', subtype: 'punctuation', confidence: 'high', reason: 'Punctuation token.' };
  if (tokenizerGrammar) return { category: 'grammar', subtype: tokens.some(isParticleToken) ? 'particle' : 'auxiliary', confidence: 'high', reason: 'Tokenizer identifies only particle/auxiliary material.' };
  if (tokenizerPronoun && counts.term >= counts.name) return { category: 'term', subtype: 'pronoun', confidence: 'high', reason: 'Tokenizer pronoun evidence outweighs incidental name entries.' };
  if (tokenizerProper && counts.name > 0) return { category: 'proper-name', subtype: 'name', confidence: 'high', reason: 'Tokenizer proper-noun evidence agrees with a name dictionary.' };

  const nameStrong = sourceCounts.name >= 2 && (counts.name >= counts.term || tokenizerProper);
  if (nameStrong) return { category: 'proper-name', subtype: 'name', confidence: tokenizerProper ? 'high' : 'medium', reason: 'Multiple name sources and supporting evidence.' };

  const grammarStrong = counts.grammar > 0 && (hasParticle || multiToken) && sourceCounts.grammar >= 1;
  if (grammarStrong && counts.grammar >= Math.max(1, counts.term * 0.4)) return { category: 'grammar', subtype: 'grammar-expression', confidence: 'medium', reason: 'Multi-token/particle span with grammar dictionary evidence.' };

  const expressionStrong = counts.expression > 0 && multiToken && (hasParticle || surface.length >= 4) && counts.expression >= Math.max(1, counts.term * 0.35);
  if (expressionStrong) return { category: 'term', subtype: 'fixed-expression', confidence: 'medium', reason: 'Dictionary-backed multi-token fixed expression; treated as a learnable lexical span.' };

  if (counts.term > 0 || isLexicalToken(tokens[0])) {
    const subtype = /動詞|verb/.test(pos) ? 'verb' : /形容詞|adjective/.test(pos) ? 'adjective' : /代名詞|pronoun/.test(pos) ? 'pronoun' : 'noun-or-term';
    return { category: 'term', subtype, confidence: counts.term > 0 ? 'high' : 'medium', reason: counts.term > 0 ? 'Term evidence and tokenizer lexical evidence.' : 'Tokenizer lexical evidence; dictionary evidence absent.' };
  }
  return { category: 'grammar', subtype: 'function-word', confidence: 'low', reason: 'No strong lexical evidence; conservative function-word fallback.' };
}

function behaviorForCategory(category) {
  if (category === 'term') return { countsForComprehension: true, showInNewWords: true, colorRole: 'frequency-or-known' };
  if (category === 'proper-name') return { countsForComprehension: false, showInNewWords: false, colorRole: 'name' };
  if (category === 'grammar') return { countsForComprehension: false, showInNewWords: false, colorRole: 'grammar' };
  return { countsForComprehension: false, showInNewWords: false, colorRole: 'ignored' };
}

function entriesAreGrammarOnly(entries = []) {
  return entries.length > 0 && entries.every(entry => (entry.dictionaryType || entry.type) === 'grammar');
}

function findBestDictionarySpan(index, tokens, start, maxTokens = 7) {
  let best = null;
  let text = '';
  for (let end = start; end < Math.min(tokens.length, start + maxTokens); end += 1) {
    if (isPunctuationToken(tokens[end])) break;
    text += analysisTokenSurface(tokens[end]);
    const exactMatches = lookupExact(index, text);
    if (!exactMatches.length) continue;

    const endsWithHardParticle = isHardBoundaryParticle(tokens[end]);
    // A trailing particle belongs to the next grammar span unless the whole exact
    // dictionary entry is itself grammar. Internal particles remain allowed.
    if (endsWithHardParticle && !entriesAreGrammarOnly(exactMatches)) continue;

    const useful = exactMatches.some(entry => ['term', 'grammar', 'expression', 'name'].includes(entry.dictionaryType || entry.type || 'term'));
    if (useful) best = { start, end, surface: text, lemma: text, entries: exactMatches, method: 'exact-dictionary-span' };
  }
  return best;
}

function findExpressiveSokuonSpan(index, tokens, start, maxTokens = 5) {
  let raw = '', normalized = '', removed = 0, best = null;
  for (let end = start; end < Math.min(tokens.length, start + maxTokens); end += 1) {
    const token = tokens[end];
    if (isPunctuationToken(token) || isParticleToken(token) || (isAuxiliaryToken(token) && !isExpressiveSokuonToken(token))) break;
    const part = analysisTokenSurface(token);
    raw += part;
    if (isExpressiveSokuonToken(token) && end > start && end + 1 < tokens.length) removed += 1;
    else normalized += part;
    if (removed && end >= start + 2) {
      const entries = lookupExact(index, normalized);
      if (entries.length) best = { start, end, surface: raw, lemma: normalized, entries, method: 'expressive-sokuon-normalization', reconstruction: { accepted: true, removedSokuonCount: removed, exactMatchCount: entries.length, reason: `Removed ${removed} expressive internal small-tsu token(s) and found an exact dictionary headword.` } };
    }
  }
  return best;
}

function generateVerbStemCandidates(surface) {
  const text = compactAnalysisText(surface);
  const rules = [['き','く'],['ぎ','ぐ'],['し','す'],['ち','つ'],['に','ぬ'],['び','ぶ'],['み','む'],['り','る'],['い','う']];
  return rules.filter(([a]) => text.endsWith(a)).map(([a,b]) => ({ text: `${text.slice(0,-a.length)}${b}`, stemEnding: a, dictionaryEnding: b }));
}

function findVerbStemHeadwordSpan(index, tokens, start, maxTokens = 4) {
  let raw = '', best = null;
  for (let end = start; end < Math.min(tokens.length, start + maxTokens); end += 1) {
    const token = tokens[end];
    if (isPunctuationToken(token) || isParticleToken(token) || isAuxiliaryToken(token)) break;
    raw += analysisTokenSurface(token);
    if (end === start) continue;
    const prefix = tokens.slice(start,end).map(analysisTokenSurface).join('');
    for (const candidate of generateVerbStemCandidates(analysisTokenSurface(token))) {
      const lemma = `${prefix}${candidate.text}`;
      const entries = lookupExact(index, lemma);
      if (entries.length) best = { start, end, surface: raw, lemma, entries, method: 'reconstructed-verb-stem-headword', verbLemma: candidate.text, reconstruction: { accepted: true, exactMatchCount: entries.length, ...candidate, reason: 'Controlled verb-stem reconstruction produced an exact complete dictionary headword.' } };
    }
  }
  return best;
}

function sourceKey(entry) {
  return entry?.sourceDictionary || entry?.source || entry?.dictionaryId || 'unknown';
}

function buildParticleCrossingCandidate(tokens, start, verbIndex) {
  if (verbIndex < start + 2) return null;
  const window = tokens.slice(start, verbIndex + 1);
  const beforeVerb = window.slice(0, -1);
  if (!beforeVerb.some(isParticleToken)) return null;
  if (beforeVerb.some(token => isPunctuationToken(token) || isAuxiliaryToken(token))) return null;
  const verb = tokens[verbIndex];
  if (!isLexicalToken(verb) || !/動詞|verb/.test(analysisTokenPos(verb))) return null;
  const lemma = `${beforeVerb.map(analysisTokenSurface).join('')}${analysisTokenLemma(verb)}`;
  return {
    lemma,
    verbLemma: analysisTokenLemma(verb),
    internalParticles: beforeVerb.filter(isParticleToken).map(analysisTokenSurface)
  };
}

function evaluateReconstructedHeadword(entries = []) {
  const sourceCount = new Set(entries.map(sourceKey)).size;
  const exactMatchCount = entries.length;
  const expressionCount = entries.filter(entry => (entry.dictionaryType || entry.type) === 'expression').length;
  const tagText = entries.map(entry => `${(entry.tags || []).join(' ')} ${entry.termTags || ''} ${entry.expressionType || ''}`).join(' ');
  const explicitLexicalTag = /idiom|idiomatic|fixed|set phrase|慣用|成句|熟語|連語|定型|lexical/i.test(tagText);
  // Word-understanding rule only: repeated exact headword evidence across independent
  // dictionaries establishes a stable lexical unit without deciding its category.
  const accepted = exactMatchCount > 0 && (sourceCount >= 3 || expressionCount > 0 || explicitLexicalTag);
  return {
    accepted,
    exactMatchCount,
    sourceCount,
    expressionCount,
    explicitLexicalTag,
    reason: accepted
      ? sourceCount >= 3
        ? `Exact reconstructed headword confirmed by ${sourceCount} independent dictionaries.`
        : expressionCount > 0
          ? 'Exact reconstructed headword confirmed by an expression dictionary.'
          : 'Exact reconstructed headword has an explicit lexical-unit tag.'
      : exactMatchCount === 0
        ? 'Reconstructed headword is absent from the runtime dictionary index.'
        : `Reconstructed headword has ${sourceCount} independent source(s); threshold is 3.`
  };
}

function findParticleCrossingHeadwordSpan(index, tokens, start, maxTokens = 7) {
  let best = null;
  for (let verbIndex = start + 2; verbIndex < Math.min(tokens.length, start + maxTokens); verbIndex += 1) {
    if (isPunctuationToken(tokens[verbIndex])) break;
    const candidate = buildParticleCrossingCandidate(tokens, start, verbIndex);
    if (!candidate) continue;
    const entries = lookupExact(index, candidate.lemma);
    const reconstruction = evaluateReconstructedHeadword(entries);
    if (!reconstruction.accepted) continue;
    let end = verbIndex;
    let cursor = end + 1;
    while (cursor < tokens.length && isConjugationBridge(tokens[cursor])) { end = cursor; cursor += 1; }
    best = {
      start,
      end,
      surface: tokens.slice(start, end + 1).map(analysisTokenSurface).join(''),
      lemma: candidate.lemma,
      entries,
      method: 'reconstructed-complete-headword',
      verbLemma: candidate.verbLemma,
      internalParticles: candidate.internalParticles,
      reconstruction
    };
  }
  return best;
}

function findCompoundVerbSpan(index, tokens, start) {
  const first = tokens[start];
  if (!isLexicalToken(first) || !/動詞|verb/.test(analysisTokenPos(first))) return null;
  const second = tokens[start + 1];
  if (!second || !isDependentLexicalVerb(second)) return null;

  const compoundLemma = `${analysisTokenSurface(first)}${analysisTokenLemma(second)}`;
  const entries = lookupExact(index, compoundLemma);
  if (!entries.length) return null;

  let end = start + 1;
  let cursor = end + 1;
  while (cursor < tokens.length && isConjugationBridge(tokens[cursor])) {
    end = cursor;
    cursor += 1;
  }
  return {
    start,
    end,
    surface: tokens.slice(start, end + 1).map(analysisTokenSurface).join(''),
    lemma: compoundLemma,
    entries,
    method: 'compound-verb-reconstruction'
  };
}

function findGrammarSpan(index, tokens, start, maxTokens = 5) {
  let best = null;
  let text = '';
  for (let end = start; end < Math.min(tokens.length, start + maxTokens); end += 1) {
    if (isPunctuationToken(tokens[end])) break;
    text += analysisTokenSurface(tokens[end]);
    const entries = lookupExact(index, text).filter(entry => (entry.dictionaryType || entry.type) === 'grammar');
    if (entries.length) best = { start, end, surface: text, lemma: text, entries, method: 'exact-grammar-span' };
  }
  return best;
}

function findCopulaChainSpan(tokens, start) {
  if (!isCopulaToken(tokens[start])) return null;
  let end = start;
  while (end + 1 < tokens.length && isAuxiliaryToken(tokens[end + 1]) && !isPunctuationToken(tokens[end + 1])) end += 1;
  return { start, end, surface: tokens.slice(start,end+1).map(analysisTokenSurface).join(''), lemma: 'だ', method: 'copula-chain' };
}

export function analyzeMiningWords(index, currentData = {}) {
  const tokens = selectTokenSource(currentData).map((token, index) => ({ ...token, _analysisIndex: index }));
  const rows = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    const surface = analysisTokenSurface(token);
    if (!surface) { i += 1; continue; }

    if (isPunctuationToken(token)) {
      const behavior = behaviorForCategory('ignored');
      rows.push({ surface, lemma: surface, category: 'ignored', subtype: 'punctuation', tokens: [token], evidence: evidenceCounts([]), confidence: 'high', reason: 'Punctuation token.', ...behavior });
      i += 1;
      continue;
    }

    // Grammar starts its own span. Do not attach ordinary particles to a preceding term.
    if (isParticleToken(token) || (isAuxiliaryToken(token) && !isLexicalToken(token))) {
      const grammarSpan = findCopulaChainSpan(tokens, i) || findGrammarSpan(index, tokens, i);
      const end = grammarSpan?.end ?? i;
      const spanTokens = tokens.slice(i, end + 1);
      const spanSurface = spanTokens.map(analysisTokenSurface).join('');
      const entries = grammarSpan?.entries || lookupExact(index, spanSurface);
      const decision = categoryFromEvidence(spanSurface, spanTokens, entries);
      const category = decision.category === 'term' ? 'grammar' : decision.category;
      const behavior = behaviorForCategory(category);
      rows.push({
        surface: spanSurface, lemma: grammarSpan?.lemma || spanSurface, category,
        subtype: decision.subtype === 'noun-or-term' ? 'function-word' : decision.subtype,
        tokens: spanTokens, trailingGrammar: spanTokens.map(analysisTokenSurface),
        evidence: evidenceCounts(entries), matchMethod: grammarSpan?.method || 'tokenizer-grammar-boundary',
        confidence: decision.confidence, reason: grammarSpan ? 'Exact grammar span.' : 'Tokenizer particle/auxiliary boundary.',
        frequencyKey: '', knownWordKey: '', ...behavior
      });
      i = end + 1;
      continue;
    }

    const expressiveSpan = findExpressiveSokuonSpan(index, tokens, i);
    const reconstructedSpan = findParticleCrossingHeadwordSpan(index, tokens, i);
    const stemSpan = findVerbStemHeadwordSpan(index, tokens, i);
    const compoundSpan = findCompoundVerbSpan(index, tokens, i);
    const dictionarySpan = findBestDictionarySpan(index, tokens, i);
    let chosenSpan = null;
    if (expressiveSpan) chosenSpan = expressiveSpan;
    else if (reconstructedSpan) chosenSpan = reconstructedSpan;
    else if (stemSpan && (!dictionarySpan || stemSpan.end >= dictionarySpan.end)) chosenSpan = stemSpan;
    else if (compoundSpan && (!dictionarySpan || compoundSpan.end >= dictionarySpan.end)) chosenSpan = compoundSpan;
    else if (dictionarySpan && dictionarySpan.end > i) chosenSpan = dictionarySpan;

    let end = chosenSpan?.end ?? i;
    if (!chosenSpan && isLexicalToken(token)) {
      let cursor = i + 1;
      while (cursor < tokens.length && shouldAttachConjugationBridge(token, tokens[cursor])) {
        end = cursor;
        cursor += 1;
      }
    }

    const spanTokens = tokens.slice(i, end + 1);
    const spanSurface = spanTokens.map(analysisTokenSurface).join('');
    const formResult = lookupWithDictionaryForms(index, spanSurface, { tokens: spanTokens });
    const directEntries = chosenSpan?.entries || lookupExact(index, spanSurface);
    const entries = directEntries.length ? directEntries : formResult.matches;
    const lemma = chosenSpan?.lemma || formResult.matchedText || analysisTokenLemma(spanTokens.find(isLexicalToken) || token) || spanSurface;
    const decision = categoryFromEvidence(spanSurface, spanTokens, entries);
    const behavior = behaviorForCategory(decision.category);
    rows.push({
      surface: spanSurface,
      lemma,
      category: decision.category,
      subtype: chosenSpan?.method === 'compound-verb-reconstruction' ? 'compound-verb' : chosenSpan?.method === 'reconstructed-complete-headword' ? 'dictionary-headword-span' : decision.subtype,
      tokens: spanTokens,
      trailingGrammar: spanTokens.slice(1).filter(isConjugationBridge).map(analysisTokenSurface),
      evidence: evidenceCounts(entries),
      matchMethod: chosenSpan?.method || (directEntries.length ? 'exact-dictionary-span' : formResult.matchedBy),
      confidence: decision.confidence,
      reason: chosenSpan?.reconstruction?.reason || (chosenSpan?.method === 'compound-verb-reconstruction' ? 'Dictionary-backed compound verb plus inflection chain.' : decision.reason),
      frequencyKey: decision.category === 'term' ? lemma : '',
      knownWordKey: decision.category === 'term' ? lemma : '',
      fallbackFrequencyKey: chosenSpan?.verbLemma || '',
      fallbackKnownWordKey: chosenSpan?.verbLemma || '',
      internalParticles: chosenSpan?.internalParticles || [],
      reconstruction: chosenSpan?.reconstruction || null,
      ...behavior
    });
    i = end + 1;
  }
  return { sentence: currentData?.plainText || tokens.map(analysisTokenSurface).join(''), tokenCount: tokens.length, rows };
}

function miningLookupTokenSpan(tokens, selectedText) {
  const target = compactAnalysisText(selectedText);
  const usable = (tokens || []).filter(token => analysisTokenSurface(token));
  for (let start = 0; start < usable.length; start += 1) {
    let joined = '';
    for (let end = start; end < usable.length && joined.length <= target.length; end += 1) {
      joined += analysisTokenSurface(usable[end]);
      if (joined === target) return usable.slice(start, end + 1);
    }
  }
  return [];
}

export function lookupWithDictionaryForms(index, selectedText, currentData = {}) {
  const surface = compactAnalysisText(selectedText);
  const attempts = [];
  const seen = new Set();
  const add = (text, method, detail = '') => {
    const normalized = compactAnalysisText(text);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    attempts.push({ text: normalized, method, detail, matches: lookupExact(index, normalized) });
  };
  add(surface, 'surface', 'Exact selected surface.');
  const sources = [currentData?.classifiedWords, currentData?.displayWords, currentData?.contentWords, currentData?.tokens]
    .filter(Array.isArray);
  for (const source of sources) {
    const span = miningLookupTokenSpan(source, surface);
    if (!span.length) continue;
    if (span.length === 1) add(analysisTokenLemma(span[0]), 'tokenizer-dictionary-form', `${analysisTokenSurface(span[0])} -> ${analysisTokenLemma(span[0])}`);
    if (span.length >= 3 && span.slice(1, -1).some(isExpressiveSokuonToken)) {
      const normalized = span.filter(token => !isExpressiveSokuonToken(token)).map(analysisTokenSurface).join('');
      if (lookupExact(index, normalized).length) add(normalized, 'expressive-sokuon-normalization', 'Removed expressive internal small-tsu; exact complete headword found.');
    }
    if (span.length >= 2) {
      const finalIndex = span.map(token => !isPunctuationToken(token) && !isParticleToken(token) && !isAuxiliaryToken(token)).lastIndexOf(true);
      if (finalIndex > 0) {
        const prefix = span.slice(0, finalIndex).map(analysisTokenSurface).join('');
        for (const candidate of generateVerbStemCandidates(analysisTokenSurface(span[finalIndex]))) {
          const lemma = `${prefix}${candidate.text}`;
          if (lookupExact(index, lemma).length) add(lemma, 'reconstructed-verb-stem-headword', 'Controlled verb-stem reconstruction found an exact complete headword.');
        }
      }
    }
    // Reconstruct complete particle-crossing headwords before component fallbacks.
    for (let verbIndex = 2; verbIndex < span.length; verbIndex += 1) {
      const candidate = buildParticleCrossingCandidate(span, 0, verbIndex);
      if (!candidate) continue;
      const matches = lookupExact(index, candidate.lemma);
      const reconstruction = evaluateReconstructedHeadword(matches);
      if (reconstruction.accepted) add(candidate.lemma, 'reconstructed-complete-headword', reconstruction.reason);
    }
    // If no complete lexical unit is confirmed, prefer the final lexical verb.
    const finalLexicalIndex = span.map(isLexicalToken).lastIndexOf(true);
    if (finalLexicalIndex >= 0) {
      const finalLexical = span[finalLexicalIndex];
      add(analysisTokenLemma(finalLexical), 'final-lexical-head', `Final lexical token ${analysisTokenSurface(finalLexical)} -> ${analysisTokenLemma(finalLexical)}.`);
    }
    // Component headwords are diagnostic fallbacks only.
    const lexicalIndex = span.findIndex(isLexicalToken);
    if (lexicalIndex >= 0) {
      const lexical = span[lexicalIndex];
      add(analysisTokenLemma(lexical), 'main-lexical-head', `Main lexical token ${analysisTokenSurface(lexical)} -> ${analysisTokenLemma(lexical)}.`);
      const prefix = span.slice(0, lexicalIndex).map(analysisTokenSurface).join('');
      if (prefix) add(`${prefix}${analysisTokenLemma(lexical)}`, 'phrase-lexical-head-reconstruction', 'Preserved token prefix and replaced lexical head with lemma.');
    }
    // Compound-verb reconstruction: combine preceding verb stem(s) with the final independent verb lemma.
    for (let i = 1; i < span.length; i += 1) {
      if (!isLexicalToken(span[i])) continue;
      const previous = span.slice(0, i).filter(token => !isParticleToken(token) && !isAuxiliaryToken(token));
      if (!previous.length) continue;
      const prefix = previous.map(analysisTokenSurface).join('');
      const lemma = analysisTokenLemma(span[i]);
      add(`${prefix}${lemma}`, 'compound-verb-reconstruction', `${prefix} + ${lemma}`);
    }
  }
  const selectedAttempt = attempts.find(attempt => attempt.matches.length > 0) || null;
  return {
    surface,
    attempts,
    selectedAttempt,
    matches: selectedAttempt?.matches || [],
    matchedText: selectedAttempt?.text || '',
    matchedBy: selectedAttempt?.method || 'none',
    matchDetail: selectedAttempt?.detail || ''
  };
}
