# Phase 15.9 Runtime Qualification Worksheet

Record only directly observed results as **passed, failed, blocked, or not-applicable**. Keep generated machine evidence outside Git in `D:\Mining\_PROJECT_WORK`.

## Identity

- Frontend commit: `520522d43f6f7ebad87270dd648ba090a9892bed`
- Backend commit: `a82d2713a90fb80fc66503d8d76b0be493cfde1a`
- Operator:
- Started at:
- Completed at:

## Startup and shutdown

- [ ] Normal VBScript launcher starts one owned application.
- [ ] Duplicate launch reuses the owned application.
- [ ] JP Analyzer liveness and health are available.
- [ ] Optional AnkiConnect and VOICEVOX failures remain nonblocking.
- [ ] Diagnostics launcher is read-only.
- [ ] Stop launcher closes owned listeners without touching foreign processes.
- [ ] No orphan chain or stale owned lock remains.

## Reader and scenes

- [ ] Two unrelated EPUBs open.
- [ ] Ordered text, ruby, headings, navigation, and illustrations are preserved.
- [ ] Previous, Next, scene jump, and chapter jump work.
- [ ] Horizontal and vertical reading work.
- [ ] Furigana on and off work.
- [ ] Illustration blur and reveal work.
- [ ] Reader progress returns to the same scene after reload.
- [ ] Pointer and keyboard span selection agree; Escape clears selection.

## Mining and Teaching

- [ ] Known-word actions show correct ownership and recovery text.
- [ ] Eligible mining shows and retains the pinned Kiku target.
- [ ] Enrichment failures remain recoverable and domain-scoped.
- [ ] One logical sentence enters Teaching; a cross-sentence range is rejected.
- [ ] Preview, diagnosis, details, final review, and success states work.
- [ ] Existing Teaching evidence reopens without creating a record.
- [ ] Saving evidence does not tune or activate the analyzer.

## Settings, accessibility, and responsive layouts

- [ ] Settings opens from Tools, traps focus, closes with Escape, and returns focus.
- [ ] Reading, Integrations, Dictionaries, Teaching administration, and Diagnostics open.
- [ ] Debug Report v2 exports without secrets by default.
- [ ] Visible focus works throughout the application.
- [ ] Layouts pass at 1440, 1100, 900, 768, 480, 370, and 360 px.
- [ ] Reduced motion and Windows High Contrast remain usable.
- [ ] No application-level horizontal overflow occurs.

## Repository and evidence

- [ ] `phase15_9_qualification.json` records automated results.
- [ ] Frontend and backend commits match this worksheet.
- [ ] Backend database hashes are unchanged when `--backend` is used.
- [ ] Both repositories remain clean after runtime qualification.
- [ ] Both commits are pushed.

## Decision

- Automated frontend:
- Automated backend:
- Runtime:
- Shutdown:
- Overall Phase 15.9 decision:
- Findings and evidence paths:

