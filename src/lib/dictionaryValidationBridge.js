/**
 * Phase 7B.5 browser bridge.
 *
 * `lookupExact` must be the app's existing exact-headword lookup function.
 * It may return an array directly or an object with `entries`/`matches`.
 */

const LEXICALIZED_TAG_PATTERN = /(idiom|fixed|expression|phrase|慣用|成句|連語|熟語)/iu;
const LEXICALIZED_EXACT_TAGS = new Set(["exp"]);

function normalizeEntries(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.entries)) return result.entries;
  if (Array.isArray(result?.matches)) return result.matches;
  return [];
}

function sourceName(entry) {
  return (
    entry?.sourceDictionary ||
    entry?.dictionaryTitle ||
    entry?.dictionary ||
    entry?.source ||
    "unknown"
  );
}

function entrySignals(entry) {
  const values = [
    ...(Array.isArray(entry?.tags) ? entry.tags : []),
    ...(Array.isArray(entry?.termTags) ? entry.termTags : []),
    entry?.dictionaryType,
    entry?.category,
    entry?.type,
  ].filter(Boolean).map(String);
  return values.filter((value) => {
    const normalized = value.trim().toLowerCase();
    return LEXICALIZED_EXACT_TAGS.has(normalized) || LEXICALIZED_TAG_PATTERN.test(value);
  });
}

export async function validateAnalyzerCandidates(structure, lookupExact) {
  if (typeof lookupExact !== "function") {
    throw new TypeError("lookupExact must be a function");
  }

  const candidates = structure?.candidates || [];
  const records = [];

  for (const candidate of candidates) {
    const result = await lookupExact(candidate.candidateHeadword);
    const entries = normalizeEntries(result);
    const sources = [...new Set(entries.map(sourceName))];
    const lexicalizedSignals = [...new Set(entries.flatMap(entrySignals))];

    records.push({
      candidateId: candidate.candidateId,
      candidateHeadword: candidate.candidateHeadword,
      exactMatchCount: entries.length,
      sourceCount: sources.length,
      sourceNames: sources,
      lexicalizedEvidence: lexicalizedSignals.length > 0,
      lexicalizedSignals,
      entries: entries.map((entry) => ({
        term: entry.term || entry.expression || entry.headword,
        reading: entry.reading,
        source: sourceName(entry),
        tags: entry.tags || entry.termTags || [],
        dictionaryType: entry.dictionaryType || entry.category || entry.type,
      })),
    });
  }

  return records;
}

export async function finalizeAnalyzerStructure({
  structure,
  lookupExact,
  analyzerBaseUrl = "http://127.0.0.1:8766",
}) {
  const validationRecords = await validateAnalyzerCandidates(structure, lookupExact);
  const response = await fetch(`${analyzerBaseUrl}/finalize-structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ structure, validationRecords }),
  });
  if (!response.ok) {
    throw new Error(`Analyzer validation failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
