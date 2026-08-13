# Phase 14.5: Contextual Reader Activation

Phase 14.5 activates the qualified contextual scene stream in the authoritative Reader model.

- Every readable text-block event is owned exactly once by one contextual scene.
- Images, headings, thematic breaks, excluded sections, section changes, and EPUB documents remain hard boundaries.
- Complete attached candidates retain safe inline markup and ruby.
- The complete visible contextual scene is one Reader item and therefore one JP Analyzer request.
- Image items remain in authoritative event order and sidebar image scene numbers are rebuilt from final scene indexes.
- Activation falls back to the existing authoritative event-scene path if contextual ownership or markup qualification fails.

This is not a return to the retired legacy EPUB parser. Both streams use the same Phase 13 authoritative runtime.
