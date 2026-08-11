# Phase 13.6 Qualified Shadow Book Activation

Phase 13.6 introduces a reversible Reader-model activation boundary. The default mode is `legacy`. `shadow-compare` constructs and compares a qualified stream while returning legacy output. `qualified-shadow` activates only after reconstruction, ownership, section-range, and event-order gates pass; otherwise the legacy result is returned with a structured fallback reason.

The qualified adapter preserves cover and front matter order, excludes non-readable navigation sections, uses navigation-aware chapter boundaries, suppresses only medium/high-confidence ornaments, and keeps publisher marks and unknown images. Runtime events are attached non-enumerably to shadow diagnostics, so exported Debug Reports remain sanitized.

Set `VITE_EPUB_READER_MODEL_MODE` to `legacy`, `shadow-compare`, or `qualified-shadow`. Unknown values resolve to `legacy`.
