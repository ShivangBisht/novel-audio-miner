export function ReaderHeader({
  title,
  chapterTitle,
  chapterIndex,
  chapterCount,
  sceneNumber,
  sceneCount,
  sceneType,
  onLoadAnotherBook,
  onOpenTools
}) {
  const progress = sceneCount > 0 ? Math.round((sceneNumber / sceneCount) * 100) : 0;
  return <header className="reader-header" data-testid="reader-header">
    <div className="reader-header-context">
      <span className="reader-header-eyebrow">Now reading</span>
      <div className="reader-header-title-row">
        <h1 title={title}>{title}</h1>
        <span className="reader-scene-kind">{sceneType === 'illustration' ? 'Illustration' : 'Text'}</span>
      </div>
      <div className="reader-header-location">
        <span>{chapterTitle || `Chapter ${chapterIndex + 1}`}</span>
        <span aria-hidden="true">·</span>
        <span>Chapter {chapterIndex + 1} of {chapterCount}</span>
      </div>
    </div>
    <div className="reader-header-progress" aria-label={`Reading progress ${progress}%`}>
      <div className="reader-progress-copy">
        <span>Scene {sceneNumber} of {sceneCount}</span>
        <strong>{progress}%</strong>
      </div>
      <div className="reader-progress-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
    <div className="reader-header-actions">
      <button type="button" className="reader-tools-button secondary" onClick={onOpenTools} aria-label="Open settings and tools">Tools</button>
      <button type="button" className="reader-book-action secondary" onClick={onLoadAnotherBook}>Change book</button>
    </div>
  </header>;
}

export function ReaderNavigation({
  sceneNumber,
  sceneCount,
  goInput,
  onGoInput,
  onGo,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled
}) {
  return <nav className="reader-navigation" aria-label="Reader navigation" data-testid="reader-navigation">
    <div className="reader-navigation-actions">
      <button type="button" className="reader-nav-button secondary" onClick={onPrevious} disabled={previousDisabled} aria-label="Previous scene">
        <span aria-hidden="true">←</span><span>Previous</span>
      </button>
      <div className="reader-scene-jump">
        <label htmlFor="reader-scene-number"><span className="reader-scene-jump-label">Scene</span><span className="reader-scene-current" aria-hidden="true">{sceneNumber}/{sceneCount}</span></label>
        <input id="reader-scene-number" type="number" min="1" max={sceneCount} value={goInput} onChange={onGoInput} onKeyDown={event => { if (event.key === 'Enter') onGo(); }} placeholder={String(sceneNumber)} />
        <button type="button" className="quiet" onClick={onGo}>Go</button>
      </div>
      <button type="button" className="reader-nav-button secondary" onClick={onNext} disabled={nextDisabled} aria-label="Next scene">
        <span>Next</span><span aria-hidden="true">→</span>
      </button>
    </div>
  </nav>;
}
export function ReaderSidebarToggle({ open, onToggle }) {
  return <button
    type="button"
    className={`sidebar-toggle ${open ? 'open' : 'closed'}`}
    onClick={onToggle}
    title="Toggle sidebar (S)"
    aria-label={open ? 'Close reading sidebar' : 'Open reading sidebar'}
    aria-expanded={open}
  >
    <span aria-hidden="true">{open ? '×' : '☰'}</span>
  </button>;
}

export function ReaderSceneFrame({ type, children }) {
  return <section className={`reader-scene-frame reader-scene-frame-${type}`} aria-label={type === 'illustration' ? 'Book illustration' : 'Book text'}>
    {children}
  </section>;
}
