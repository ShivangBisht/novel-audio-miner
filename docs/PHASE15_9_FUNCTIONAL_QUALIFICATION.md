# Phase 15.9 Functional Qualification

Phase 15.9 adds a non-nested qualification harness. It invokes each supported frontend test directly with Node, runs the production build through `npm.cmd` on Windows, optionally runs JP Analyzer pytest with before-and-after database hashes, checks repository cleanliness, and writes external JSON evidence.

The default command performs frontend and build qualification. Backend qualification is explicit because it can be long-running and must be preceded by review of the discovered runtime database hash scope. Manual runtime, launcher, accessibility, responsive, mining, Teaching, and shutdown evidence remains operator-observed in the accompanying worksheet.

No production behavior, backend code, database, or launcher is changed by this milestone.

## Checkpoint binding

The qualification runner records the actual clean frontend HEAD. `PHASE15_9_FRONTEND_COMMIT` is an optional strict assertion, not a tracked self-reference. When the variable is absent, the current clean HEAD is recorded as both the actual and expected qualification identity.

## Windows build invocation

On Windows, Node cannot reliably execute the `npm.cmd` batch shim directly with `shell: false`. The qualification runner therefore invokes `npm.cmd run build` through the explicit `ComSpec` executable with `/d /s /c`. Node tests and Git commands continue to use direct process execution with `shell: false`.

## Failure-path database protection

Backend database hashes are compared in a `finally` path, so authoritative-store integrity is recorded even when pytest fails. A failed pytest result and a database mutation remain independently visible in machine evidence.
## Backend checkpoint binding

The qualification runner records the actual clean JP Analyzer HEAD. PHASE15_9_BACKEND_COMMIT is an optional strict assertion rather than a tracked backend self-reference. Without the variable, the current clean backend HEAD is recorded as both the actual and expected backend qualification identity.
