# Alpha 3 Selection Interaction and Usability

## Purpose

Alpha 3 makes the canonical Reader interaction created in Alpha 2 directly usable by pointer, touch, and keyboard without changing linguistic ownership.

## Interaction behavior

- Click or tap an analyzer span to select the complete authoritative span.
- Enter or Space activates a focused analyzer span.
- Escape clears the canonical interaction and persistent highlight.
- The selected highlight is derived only from canonical span offsets.
- Native non-collapsed drag selection is preserved for copying and Teaching ranges.

## Accessibility

Rendered analyzer fragments are keyboard focusable and expose button semantics, an accessible selection label, and `aria-selected` state. Focus and selected-state styling are visually distinct.

## Preserved boundaries

`readerSpans` remains the only linguistic authority. Alpha 3 does not change JP Analyzer, New Words semantics, known-word persistence, Teaching selection or analysis, contextual scene composition, EPUB parsing, enrichment, dictionaries, or prefetch.
