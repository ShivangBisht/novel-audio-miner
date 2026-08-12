# Phase 14.2: Minimum-Context Scene Planner

Phase 14.2 adds a pure, diagnostic planner for attaching under-context text candidates.

## Rule

- Start with one complete atomic candidate.
- If it has at least eight meaningful Unicode characters, keep it alone.
- Otherwise append the complete next candidate while no hard boundary intervenes.
- Repeat until the minimum is reached or forward attachment is blocked.
- If a final short candidate has no forward candidate, attach it backward when structurally safe.
- Never truncate an attached candidate.
- Never cross an explicit hard boundary or boundary group.

## Non-goals

This phase does not yet replace Reader scenes. It adds a deterministic planning layer and diagnostics only. It contains no expression-specific Japanese rules.
