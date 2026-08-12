# Phase 14.3: Markup-Preserving Text Ranges

Phase 14.3 maps visible plain-text offsets back to safe inline HTML fragments.

## Contract

- Ruby base text participates in visible offsets.
- `rt` and `rp` readings remain attached to selected ruby base text but do not enter analyzer plain text.
- Safe inline markup such as `ruby`, `em`, `strong`, and `span` remains structurally valid after slicing.
- HTML entities decode for offset calculation and are safely escaped in emitted fragments.
- `<br>` contributes one visible newline.
- All slices reconstruct the full visible plain text without gaps or duplication.
- Combined slices preserve complete attached candidates; no attached sentence is truncated.

## Scope

This milestone is still diagnostic-only. Reader scene replacement begins after hard-boundary integration and real-event qualification.
