# Novel Audio Miner

Novel Audio Miner is a local Japanese EPUB Reader and Anki enrichment application. JP Analyzer is the sole linguistic authority and provides versioned `readerSpans` for rendering, selection, comprehension, New Words, and mining eligibility.

## Supported workflow

1. Start the local Japanese Novel Miner application with the supported launcher.
2. Load an EPUB and read contextual text and illustration scenes.
3. Select authoritative spans by pointer or keyboard.
4. Review New Words using the separated Anki-derived and manual-known authority.
5. Enrich the newest Kiku note through AnkiConnect. The note identity is pinned for the operation.
6. Use guided Teaching to preview and record evidence or an occurrence correction. Teaching does not tune or activate the analyzer.
7. Manage dictionaries through JP Analyzer, whose SQLite store remains authoritative.

## Architecture invariants

- `readerSpans` is the sole linguistic Reader truth.
- New Words is a view, not an authority.
- Missing or partial known-word cache state is not confirmed unknown vocabulary.
- Yomitan is external and independent.
- Nadeshiko and VOICEVOX provide enrichment paths without changing linguistic authority.
- Compatibility projections are validated adapters only.

## Development

```powershell
npm.cmd install
npm.cmd run dev
```

The frontend normally uses `http://127.0.0.1:5173` and proxies JP Analyzer requests. Local frequency dictionaries remain ignored under `public/dict/`.

## Qualification

```powershell
npm.cmd run test:alpha10
npm.cmd run build
```

Run the complete supported backend suite from the JP Analyzer repository:

```powershell
& ".\.venv\Scripts\python.exe" -m pytest
```

Automated success is necessary but not sufficient for release. Complete `docs/ALPHA10_RUNTIME_QUALIFICATION.md`, verify safe shutdown, record evidence, and keep both repositories clean before promoting the manifest to release-candidate status.

## Phase 15 complete
The qualified Phase 15 interface provides a compact Reader, responsive Teaching and Settings workspaces, shared accessibility and design-system behavior, and guarded cross-project qualification. See `docs/PHASE15_10_FINAL_CLOSEOUT.md`.
