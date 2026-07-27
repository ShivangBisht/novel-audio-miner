import assert from 'node:assert/strict';
import {
  checkAllDictionaryUpdates,
  checkDictionaryUpdate,
  compareDictionaryRevision,
  evaluateUpdateAvailability,
} from '../src/lib/dictionaryUpdateCheck.js';

assert.equal(compareDictionaryRevision('2026-01-14', '2026-05-03'), -1);
assert.equal(compareDictionaryRevision('2.10.0', '2.9.0'), 1);
assert.equal(compareDictionaryRevision(null, '2.0.0'), null);
const dictionary = {
  dictionaryId: 'alpha-1', stableIdentity: 'alpha', displayTitle: 'Alpha',
  revision: '2026-01-01', contentDigest: null,
  updateManifestUrl: 'https://example.invalid/manifest.json',
};
const manifest = {
  stableIdentity: 'alpha', revision: '2026-07-27', contentDigest: null,
};
assert.deepEqual(evaluateUpdateAvailability(dictionary, manifest), {
  status: 'update-available', updateAvailable: true,
});
const fetchImpl = async url => ({
  ok: true,
  json: async () => ({
    stableIdentity: 'alpha', revision: '2026-07-27',
    downloadUrl: 'https://example.invalid/alpha.zip',
  }),
});
const checked = await checkDictionaryUpdate(dictionary, { fetchImpl });
assert.equal(checked.status, 'update-available');
assert.equal(checked.manifest.downloadUrl, 'https://example.invalid/alpha.zip');
const noSource = await checkDictionaryUpdate({ dictionaryId: 'beta' }, { fetchImpl });
assert.equal(noSource.status, 'no-update-source');
const all = await checkAllDictionaryUpdates([dictionary, { dictionaryId: 'beta' }], { fetchImpl });
assert.equal(all.length, 2);
assert.equal(all.filter(item => item.updateAvailable).length, 1);
const mismatch = evaluateUpdateAvailability(dictionary, { stableIdentity: 'other' });
assert.equal(mismatch.status, 'identity-mismatch');
console.log('dictionary update-check tests passed');
