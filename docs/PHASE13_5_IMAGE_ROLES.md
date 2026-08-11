# Phase 13.5 Diagnostic EPUB Image Roles

Phase 13.5 builds a sanitized, diagnostic-only model for ordered image occurrences and unique image resources. It uses the Phase 13.4A cover and section model, document event position, surrounding text, chapter boundaries, image-only documents, and repeated resource use.

Candidate roles are conservative: cover, navigation-image, front-matter-illustration, chapter-title-artwork, chapter-opening-illustration, full-page-illustration, inline-illustration, ornament, and unknown. Each occurrence includes confidence, supporting evidence, and counter-evidence. Low-confidence items remain included.

No image bytes, data URIs, complete text, or HTML are placed in the diagnostic model. The legacy Reader remains authoritative and JP Analyzer behavior is unchanged.

## Phase 13.5A repeated-resource correction

Repeated-resource evidence is evaluated before generic inline-image evidence. A resource repeated across at least three documents and two chapters, usually positioned between text, becomes a medium-confidence ornament candidate. Repeated terminal assets can become medium-confidence publisher-mark candidates when structural evidence agrees. Occurrence diagnostics expose counts and ratios, while alt text is represented only by presence and length. The actual alt string is not exported.
