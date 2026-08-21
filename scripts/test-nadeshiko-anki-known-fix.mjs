import assert from 'node:assert/strict';
import fs from 'node:fs';
const vite=fs.readFileSync('vite.config.js','utf8');
const enrich=fs.readFileSync('src/lib/enrichService.js','utf8');
const latest=fs.readFileSync('src/lib/latestKikuEnrichment.js','utf8');
const reader=fs.readFileSync('src/components/Reader.jsx','utf8');
const area=fs.readFileSync('src/components/reader/ReaderActionArea.jsx','utf8');
assert.ok(vite.includes("loadEnv(mode, process.cwd(), '')"));
assert.ok(vite.includes("env.NADESHIKO_API_KEY"));
assert.equal(enrich.includes('NADESHIKO_API_KEY ='),false);
assert.equal(enrich.includes("headers['Cookie']"),false);
assert.ok(enrich.includes('Array.isArray(data.segments)'));
assert.match(
  enrich,
  /const\s+MIN_CONTENT_LENGTH\s*=\s*5\s*;/,
  'Nadeshiko candidate selection must define the five-character minimum'
);
assert.ok(latest.includes("stage: 'verifyNoteFields'"));
assert.ok(latest.includes("state.outcome ="));
assert.ok(latest.includes("stored !== filename"));
assert.equal(reader.includes('addKnownWord('),false);
assert.ok(reader.includes('await buildCache(ankiRequest)'));
assert.ok(reader.includes('resolveKnownWordState(miningLookupKey).anki === true'));
assert.ok(area.includes('Enrichment partial'));
assert.ok(enrich.includes("const FUNCTION_POS = new Set(['助詞', '助動詞', '補助記号'])"));
assert.ok(enrich.includes('take: 50'));
assert.ok(enrich.includes('item.unknownCount === 0'));
assert.ok(enrich.includes("mode: 'i+1'"));
assert.ok(enrich.includes("mode: 'hard-fallback'"));
assert.ok(enrich.includes("mode: 'easy-fallback'"));
assert.ok(enrich.includes("hasRequiredMedia"));
assert.ok(enrich.includes('Nadeshiko returned no sentence containing the target word.'));
assert.ok(latest.includes('fields.selectionText && options.novelSentence'));
assert.ok(latest.includes('protectedFieldVerification'));
assert.ok(latest.includes('Protected Yomitan fields changed and were restored'));

assert.ok(
  vite.includes(
    "rewrite: stripProxyPrefix(/^\\/api\\/nadeshiko/)"
  ),
  'Nadeshiko local prefix must rewrite to the public /v1 API'
);

assert.match(
  vite,
  /proxyReq\.setHeader\(\s*'Authorization'/s,
  'Nadeshiko proxy must set Authorization'
);

assert.match(
  vite,
  /`Bearer \$\{env\.NADESHIKO_API_KEY\}`/,
  'Nadeshiko proxy must use bearer authentication'
);

assert.equal(
  vite.includes("'X-API-Key'"),
  false,
  'legacy X-API-Key authentication must be retired'
);

assert.equal(
  vite.includes("x-nadeshiko-session"),
  false,
  'session-token proxy transport must be retired'
);

assert.equal(
  vite.includes(
    "proxyReq.setHeader('Cookie'"
  ),
  false,
  'Nadeshiko public API must not use session cookies'
);

assert.equal(
  enrich.includes('X-Nadeshiko-Session'),
  false,
  'browser source must not transport a Nadeshiko session token'
);

assert.equal(
  enrich.includes('NADESHIKO_API_KEY ='),
  false,
  'browser source must not contain the API key'
);
console.log('Nadeshiko media verification and Anki-known ownership tests passed');
