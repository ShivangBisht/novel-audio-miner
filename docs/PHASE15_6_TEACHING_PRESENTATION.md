# Phase 15.6 Teaching Presentation Overhaul

## Result

The Reader-connected Teaching workflow is presented as a dedicated right-side drawer on wide screens, an overlay drawer on medium screens, and a full-screen sheet on narrow screens. Selection, preview, diagnosis, details, final review, save, existing evidence, correction state, quality state, success, and recovery are visually separated without changing Teaching behavior.

## Preserved ownership

Reader.jsx still owns Teaching selection and sentence-local analysis. TeachingPanel still owns preview and occurrence-correction coordination. TeachingDecisionPanel still owns immutable snapshot capture, automatic diagnosis, decision creation, supersession, optional occurrence correction, and completion receipts. Existing API clients, payloads, record identities, persistence, lifecycle history, and backend behavior are unchanged.

## Accessibility and responsiveness

The Teaching surface is an accessible modal dialog with labelled headings, a labelled close action, live progress, alert errors, visible focus, touch-sized controls, reduced-motion handling, sticky workflow actions, and full-screen narrow-layout behavior. Technical identifiers and diagnosis details remain progressively disclosed.

## Runtime layout refinement

Runtime review moved the Teaching surface to the left edge of the Reader viewport, widened it to use the readable content area, and gave the surface a distinct muted plum-charcoal palette. The Reader sidebar remains visible, a narrow part of the reading viewport remains visible on wide screens, and medium or narrow layouts continue to use overlay or full-screen behavior. Teaching behavior and persistence remain unchanged.
