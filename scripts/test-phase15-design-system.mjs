import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('src/styles.css', 'utf8');
const workspace = fs.readFileSync('src/components/SettingsWorkspace.jsx', 'utf8');
const reader = fs.readFileSync('src/components/Reader.jsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const token of [
  'PHASE15_8_DESIGN_SYSTEM_BEGIN',
  '--ui-control-min:40px',
  '--ui-touch-min:44px',
  '--ui-focus:',
  'color-scheme:dark',
  ':focus-visible',
  '@media(max-width:1100px)',
  '@media(max-width:768px)',
  '@media(max-width:480px)',
  '@media(max-width:370px)',
  '@media(prefers-reduced-motion:reduce)',
  '@media(forced-colors:active)',
  'overflow-x:hidden',
  '.reader-scene-frame-text .sentence-content{font-family:inherit}'
]) assert.ok(css.includes(token), `missing design-system contract: ${token}`);

for (const retired of [
  '.reader-tools-layer {',
  '.reader-tools-panel {',
  '.reader-tools-header {',
  '.reader-tools-content {'
]) assert.equal(css.includes(retired), false, `retired Tools CSS remains: ${retired}`);

for (const token of [
  'const dialogRef=useRef(null)',
  'const returnTarget=document.activeElement',
  "if(event.key!=='Tab') return",
  'event.shiftKey && document.activeElement===first',
  '!event.shiftKey && document.activeElement===last',
  'returnTarget?.focus?.()',
  'ref={dialogRef}',
  'aria-describedby="settings-workspace-description"',
  'id="settings-workspace-description"'
]) assert.ok(workspace.includes(token), `missing Settings accessibility contract: ${token}`);

for (const token of [
  'fontFamily: FONT_STACKS[readerStyle.fontFamily]',
  '<TeachingPanel',
  '<SettingsWorkspace',
  'runLatestKikuEnrichment({'
]) assert.ok(reader.includes(token), `frozen Reader contract missing: ${token}`);

assert.equal(
  pkg.scripts['test:phase15.8'],
  'npm run test:phase15.7 && node scripts/test-phase15-design-system.mjs && npm run build'
);
console.log('Phase 15.8 design system, responsiveness, and accessibility tests passed');
