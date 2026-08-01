import fs from 'node:fs';
const panel=fs.readFileSync('src/components/TeachingPortabilityPanel.jsx','utf8');
const client=fs.readFileSync('src/lib/teachingPortabilityClient.js','utf8');
const quality=fs.readFileSync('src/components/TeachingCorpusQualityPanel.jsx','utf8');
for(const phrase of ['Export Teaching evidence','Preview import','Apply verified import','This does not tune or activate the analyzer','Dictionaries and occurrence corrections are not included'])if(!panel.includes(phrase))throw new Error(`Missing portability UI phrase: ${phrase}`);
for(const route of ['/teaching-portability/export','/teaching-portability/verify','/teaching-portability/import/preview','/teaching-portability/import/apply'])if(!client.includes(route))throw new Error(`Missing portability route: ${route}`);
if(!quality.includes('TeachingPortabilityPanel'))throw new Error('Portability panel is not mounted');
console.log('Post-Alpha A Teaching portability checks passed.');
