# Phase 15 UI Overhaul Plan

## Status
Complete. Phase 15.1 through Phase 15.9A are qualified. Phase 15.10 consolidates snapshots, retires proven-unused presentation remnants, validates the final cross-project state, and prepares the `phase15-complete` merge tag.

## Purpose

Redesign the reading interface around the stable Phase 13 EPUB model and the
stable Phase 14 contextual-scene model. Improve hierarchy, consistency,
minimalism, typography, accessibility, responsiveness, and panel placement
without changing how content or evidence is produced.

## Visual direction

- Use one restrained, minimalist design language across all application UI.
- Preserve EPUB-provided typography inside the reading viewport when available.
- Use one consistent sans-serif application font stack everywhere outside book
  content.
- Retain a focused dark default through semantic, theme-capable design tokens.
- Use the same spacing, typography, buttons, inputs, panels, statuses, drawers,
  focus states, and interaction patterns across Reader, Teaching, settings,
  dictionaries, diagnostics, and administration.
- Keep the book visually dominant. Reveal technical and administrative detail
  progressively.

## Frozen processing boundary

Phase 15 must not change:

- EPUB parsing, reconstruction, sections, image roles, or scene ordering
- contextual wording, scene planning, logical-sentence ownership, or offsets
- JP Analyzer linguistic behavior or request/response schemas
- `readerSpans`, `readerCandidates`, or `readerSelection`
- known-word, frequency, comprehension, or New Words semantics
- Teaching selection, analysis, preview, evidence, correction, decision,
  supersession, hashing, or corpus formats
- learning, tuning, governance, portability, packaging, or evaluation processes
- mining semantics, prefetch, cache scheduling, or startup ownership

## Information architecture

### Application bar

Owns global service readiness, application-level actions, and entry to settings
or administration. Technical details remain behind disclosure.

### Reader header

Owns book identity, current chapter or section, reading progress, and concise
scene context.

### Reader navigation

Owns Previous, Next, scene jump, scene count, and keyboard-navigation cues.

### Reader sidebar

Reading-only by default:

- book identity
- current chapter or section
- progress
- chapter navigation
- New Words for the visible scene
- illustration navigation
- compact reading controls

### Reader viewport

Owns the rendered text or image, publisher typography, ruby, writing direction,
image reveal, captions, and contextual source-block layout.

### Reader action area

Owns context-sensitive selected-word actions, eligibility explanations, mining,
known-word state, and concise operation feedback.

### Teaching surface

The normal Reader-connected Teaching workflow remains a side drawer on wide
screens and a full-screen sheet on narrow screens. It shows selected text,
current result, intended result, preview, review, and save state. IDs, offsets,
candidate diagnostics, and corpus details remain available through disclosure.

### Settings and administration workspace

A separate in-application workspace owns:

- reading preferences and appearance
- Anki and enrichment integration settings
- dictionary management
- Teaching evidence administration
- corpus quality, governance, portability, packaging, evaluation, and handoff
- application diagnostics and Debug Report

These workflows may share navigation and styling but retain their existing
clients, payloads, persistence, and process boundaries.

## Shared presentation language

### Application font

Preferred local stack:

```css
Inter, "Noto Sans JP", "Yu Gothic UI", "Yu Gothic", Meiryo, system-ui, sans-serif
```

The final implementation must not depend on a network font. Monospace is
reserved for identifiers and technical values. EPUB content remains isolated
from the application font.

### Component variants

- Buttons: primary, secondary, quiet, destructive, icon-only
- Inputs: consistent label, help, focus, disabled, and error treatment
- Panels: header, optional description, content, status, actions, details
- Status: neutral, information, success, warning, error, active
- Overlays: shared header, close action, backdrop, scroll, width, and responsive
  behavior

### Responsive behavior

- Wide: persistent collapsible reading sidebar, central viewport, right Teaching
  drawer, dedicated settings/administration workspace
- Medium: collapsible sidebar and overlay Teaching drawer
- Narrow: overlay reading sidebar, full-screen Teaching sheet, full-screen tools
  workspace, touch-sized controls

### Accessibility

Visible keyboard focus, landmarks, predictable tab order, sufficient contrast,
minimum touch targets, non-color status text, accessible labels, status
announcements, and reduced-motion support are mandatory.

## Milestones

### 15.1 UI contract freeze and information architecture

Inventory visible surfaces and data lineage, freeze process contracts, define
regions, terminology, typography, semantic tokens, responsive behavior,
presentation adapters, and UI regression boundaries.

### 15.2 Reader shell decomposition

Extract presentation regions while Reader retains existing state, handlers, and
orchestration.

### 15.3 Reading interface and navigation overhaul

Redesign book/chapter presentation, progress, navigation, viewport, writing
modes, furigana, appearance, image presentation, and empty/loading states.

### 15.4 Sidebar information architecture

Make the default sidebar reading-focused and move configuration,
administration, and diagnostics elsewhere.

### 15.5 Reader actions and feedback cleanup

Clarify selected-word state, mining, known-word actions, eligibility,
integration availability, progress, success, and failure presentation without
changing action semantics.

### 15.6 Teaching presentation overhaul

Redesign reviewed, preview, diagnosis, details, save, success, correction, and
quality presentation while preserving all Teaching inputs and lifecycle.

### 15.7 Settings and administration workspace

Create a coherent workspace for reading preferences, integrations,
dictionaries, Teaching administration, and diagnostics using existing clients.

### 15.8 Design system, responsiveness, and accessibility

Consolidate tokens, typography, spacing, components, duplicate CSS, focus,
keyboard behavior, overflow, responsive layouts, and reduced motion.

### 15.9 Functional qualification

Run Phase 14, Phase 13, Phase 12B, production build, and new presentation
regressions. Manually qualify reading modes, scenes, Teaching, tools, health,
mining, and multiple viewport widths.

### 15.10 Cleanup, snapshots, and closeout

Retire obsolete UI wrappers and duplicate CSS, update both snapshots, verify
contract preservation, merge, and tag `phase15-complete`.

## Backend decision

No JP Analyzer production change is planned. A backend change is permitted only
if a required user-visible fact is proven unavailable through an existing
contract and cannot be represented by a read-only frontend adapter.
