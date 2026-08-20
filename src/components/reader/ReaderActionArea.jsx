const ROLE_LABELS = Object.freeze({
  lexical: 'Vocabulary',
  'lexical-compound': 'Vocabulary compound',
  'learnable-grammar': 'Grammar pattern',
  function: 'Function word',
  name: 'Name',
  punctuation: 'Punctuation',
  unresolved: 'Unresolved span'
});
const STAGE_LABELS = Object.freeze({
  start: 'Starting enrichment',
  checkAnkiConnect: 'Checking AnkiConnect',
  findLatestNote: 'Finding latest Kiku note',
  targetPinned: 'Target pinned',
  enrichment: 'Searching enrichment source',
  media: 'Preparing media',
  updateNoteFields: 'Updating pinned note',
  done: 'Complete',
  failed: 'Enrichment failed',
  preparing: 'Preparing enrichment'
});
function roleLabel(context) { return ROLE_LABELS[context?.displayRole] || 'Analyzer span'; }
function ownershipLabel(action) {
  if (!action?.knownKey) return 'No vocabulary-known identity';
  if (action.canUndoKnown) return action.knownState?.anki ? 'Known manually and from Anki' : 'Known manually';
  if (action.knownFromAnki) return 'Known from Anki';
  if (action.knownState?.indeterminate) return 'Known state unavailable';
  if (action.knownState?.confirmedUnknown) return 'Confirmed unknown';
  return action.knownState?.effective ? 'Known' : 'Unknown';
}
function knownActionLabel(action) {
  if (action?.canUndoKnown) return 'Undo Known';
  if (action?.knownFromAnki) return 'Known from Anki';
  if (action?.canMarkKnown) return 'Mark as Known';
  return action?.knownMessage || 'Not vocabulary-known eligible';
}
export default function ReaderActionArea({
  selectedText = '', interaction = null, selectionIssue = '', actionState,
  isWorking = false, enrichmentOperation = null, enrichmentResult = null,
  enrichmentStatus = null, onMarkKnown, onUndoKnown, onMine
}) {
  const selected = Boolean(selectedText);
  const canMine = selected && interaction?.eligibleForMining === true;
  const knownLabel = knownActionLabel(actionState);
  const knownHelp = !selected ? 'Select one Reader span to manage known-word state.' : (selectionIssue || actionState?.knownMessage || ownershipLabel(actionState));
  const miningHelp = !selected ? 'Select one Reader span to mine.' : (selectionIssue || actionState?.miningMessage || (canMine ? 'Mining is available for this authoritative span.' : 'This span is not eligible for mining.'));
  const operation = enrichmentOperation || enrichmentStatus?.details || null;
  const progress = isWorking ? (STAGE_LABELS[operation?.stage] || enrichmentStatus?.message || 'Enrichment in progress') : null;
  const target = operation?.pinnedTarget || enrichmentOperation?.pinnedTarget || null;
  const mismatch = operation?.comparison?.status === 'mismatch';
  const failure = enrichmentStatus?.severity === 'error' ? enrichmentStatus : null;
  if (!selected && !isWorking && !target && !failure) {
    return <section className="reader-action-area reader-action-area-empty" aria-label="Reader actions" data-testid="reader-action-area">
      <span>Select a Reader span for known-word and mining actions.</span>
    </section>;
  }
  return <section className="reader-action-area" aria-labelledby="reader-action-title" data-testid="reader-action-area">
    <div className="reader-action-summary">
      <span className="reader-action-eyebrow" id="reader-action-title">Selected span</span>
      <strong className="reader-action-surface" lang="ja" title={selectedText}>{selectedText || 'No selection'}</strong>
      <div className="reader-action-facts" aria-label="Selected span details">
        <span>{selected ? roleLabel(interaction) : 'Select a span in the Reader'}</span>
        <span>{selected ? ownershipLabel(actionState) : 'Known state unavailable'}</span>
        <span>{canMine ? 'Mining available' : 'Mining unavailable'}</span>
      </div>
      {(selectionIssue || (!canMine && selected)) && <p className="reader-action-explanation">{selectionIssue || miningHelp}</p>}
    </div>
    <div className="reader-action-feedback" aria-live="polite" aria-atomic="true">
      {progress && <div className="reader-action-progress"><span className="reader-action-spinner" aria-hidden="true" /><span>{progress}</span></div>}
      {target && <div className={`reader-action-target ${mismatch ? 'warning' : ''}`}>
        <span>Target note #{target.noteId}</span><strong lang="ja">{target.expression || 'Expression unavailable'}</strong>
        {mismatch && <small>{operation.comparison?.warning || 'Selected Reader identity differs from the pinned Kiku expression.'}</small>}
      </div>}
      {!isWorking && enrichmentResult && <div className="reader-action-result success"><strong>Enrichment complete</strong><span>{enrichmentResult.source}</span></div>}
      {failure && <div className="reader-action-result error"><strong>{failure.message}</strong>{failure.recoverable && failure.recoveryAction && <span>{failure.recoveryAction}</span>}</div>}
    </div>
    <div className="reader-action-controls">
      <button type="button" className={`secondary mark-known-btn ${actionState?.knownFromAnki ? 'known-from-anki-btn' : ''} ${!actionState?.canMarkKnown && !actionState?.canUndoKnown ? 'non-learning-word-btn' : ''}`}
        onClick={actionState?.canUndoKnown ? onUndoKnown : onMarkKnown}
        disabled={isWorking || !selected || (!actionState?.canUndoKnown && !actionState?.canMarkKnown)}
        aria-describedby="reader-known-help">{knownLabel}</button>
      <span id="reader-known-help" className="reader-action-help">{knownHelp}</span>
      <button type="button" className="mine-btn" onClick={onMine} disabled={isWorking || !canMine} aria-describedby="reader-mine-help">
        {isWorking ? 'Mining…' : 'Mine to Anki'}
      </button>
      <span id="reader-mine-help" className="reader-action-help">{miningHelp}</span>
    </div>
  </section>;
}
