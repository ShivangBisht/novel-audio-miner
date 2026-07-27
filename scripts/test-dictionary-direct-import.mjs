import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  chooseDictionaryOperation,
  dictionaryEntryBatches,
  inspectDictionaryPackage,
} from '../src/lib/dictionaryPackageImport.js';

const zip = new JSZip();
zip.file('index.json', JSON.stringify({
  title: 'テスト辞書', revision: '2026-07-27',
  updateManifestUrl: 'https://example.invalid/manifest.json',
}));
zip.file('term_bank_1.json', JSON.stringify([
  ['語一', 'ごいち', 'n', '', 1, 10, ['first'], 1, 'common'],
  ['語二', 'ごに', '', '', 2, 5, ['second'], 2, ''],
]));
const bytes = await zip.generateAsync({ type: 'uint8array' });
const file = { name: 'test.zip', arrayBuffer: async () => bytes.buffer };
const inspected = await inspectDictionaryPackage(file);
assert.equal(inspected.metadata.title, 'テスト辞書');
assert.equal(inspected.metadata.entryCount, 2);
assert.equal(inspected.metadata.revision, '2026-07-27');
assert.equal(inspected.metadata.updateManifestUrl, 'https://example.invalid/manifest.json');
assert.equal(inspected.metadata.contentDigest.length, 64);
const batches = [];
for await (const batch of dictionaryEntryBatches(inspected, 1)) batches.push(batch);
assert.equal(batches.length, 2);
assert.equal(batches[0][0].term, '語一');
assert.deepEqual(batches[0][0].tags, ['n', 'common']);
const install = chooseDictionaryOperation(inspected.metadata, []);
assert.equal(install.mode, 'install');
const update = chooseDictionaryOperation(inspected.metadata, [{
  dictionaryId: 'existing-id', stableIdentity: inspected.metadata.stableIdentity,
}]);
assert.equal(update.mode, 'update');
assert.equal(update.dictionaryId, 'existing-id');
console.log('direct dictionary package import tests passed');
