# Phase 13.3 Lossless Ordered Content Stream

Phase 13.3 replaces leaf-block extraction with ordered text-node ownership. Every visible source text node is consumed exactly once, including direct text before, between, and after nested structural blocks. Images, SVG images, soft breaks, thematic breaks, tables, lists, captions, ruby base text, and headings remain ordered DOM events.

The legacy Reader remains authoritative. JP Analyzer behavior is unchanged.

Diagnostics now include length delta, soft-break counts, text-node ownership, unowned text nodes, and duplicate text nodes. The shadow report continues to exclude complete extracted text and HTML.
