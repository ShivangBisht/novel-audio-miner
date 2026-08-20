# Phase 15.8 Design System, Responsiveness, and Accessibility

## Result

Phase 15.8 introduces shared semantic tokens and consistent control, focus, status, surface, spacing, and responsive rules across Reader, Teaching, Settings, dictionaries, diagnostics, and administration. EPUB text typography remains isolated inside the reading viewport.

## Accessibility

The Settings workspace now traps keyboard focus, closes with Escape, exposes a dialog description, and restores focus to the control that opened it. Global focus-visible, touch-target, reduced-motion, and forced-colour rules cover application controls without changing processing behavior.

## Cleanup and responsive behavior

Obsolete inline Reader Tools panel CSS was retired while the Tools entry button remains. Reader actions, navigation, Settings, Teaching, and dictionary controls adapt at 1100, 768, 480, and 370 pixel boundaries with bounded overflow and mobile touch sizing.

## Frozen contracts

No EPUB, analyzer, known-word, mining, enrichment, Teaching evidence, correction, dictionary, persistence, Debug Report, API, backend, or launcher contract changed.
