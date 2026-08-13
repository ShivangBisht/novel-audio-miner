# Phase 14.4: Contextual EPUB Diagnostics

Phase 14.4 connects the Phase 14.1 atomic ranges, Phase 14.2 minimum-context planner, and Phase 14.3 markup slicing to authoritative Phase 13 EPUB events.

## Hard boundaries

The diagnostic planner does not cross:

- EPUB document boundaries
- image events
- thematic breaks
- headings
- excluded navigation sections
- structural section changes

Soft breaks do not become standalone scenes.

## Privacy

Debug diagnostics contain counts, lengths, boundary reasons, section roles, and source coordinates. They do not export complete book text or reconstructed HTML.

## Scope

Reader output remains unchanged. This milestone qualifies contextual candidates against real EPUB structure before visible scene activation.
