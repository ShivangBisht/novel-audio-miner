import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
const output = 'D:/Mining/_DELETE_AFTER_20260726/phase7/tests';
await fs.mkdir(output, { recursive: true });
async function create(version, rows) {
  const zip = new JSZip();
  zip.file('index.json', JSON.stringify({
    title: 'Phase 7 Verification Dictionary',
    stableIdentity: 'phase7-verification-dictionary',
    revision: version,
    dictionaryType: 'term',
  }, null, 2));
  zip.file('term_bank_1.json', JSON.stringify(rows));
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const target = path.join(output, `phase7-test-dictionary-${version}.zip`);
  await fs.writeFile(target, bytes);
  console.log(target);
}
await create('v1', [
  ['検証語一', 'けんしょうごいち', 'n', '', 1, 1, ['Phase 7 v1 entry one'], 1, ''],
  ['検証語二', 'けんしょうごに', 'n', '', 2, 1, ['Phase 7 v1 entry two'], 2, ''],
]);
await create('v2', [
  ['検証語三', 'けんしょうごさん', 'n', '', 1, 1, ['Phase 7 v2 entry three'], 1, ''],
  ['検証語四', 'けんしょうごよん', 'n', '', 2, 1, ['Phase 7 v2 entry four'], 2, ''],
  ['検証語五', 'けんしょうごご', 'n', '', 3, 1, ['Phase 7 v2 entry five'], 3, ''],
]);
