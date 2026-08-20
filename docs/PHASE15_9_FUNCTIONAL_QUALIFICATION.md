# Phase 15.9 Functional Qualification

Phase 15.9 adds a non-nested qualification harness. It invokes each supported frontend test directly with Node, runs the production build through `npm.cmd` on Windows, optionally runs JP Analyzer pytest with before-and-after database hashes, checks repository cleanliness, and writes external JSON evidence.

The default command performs frontend and build qualification. Backend qualification is explicit because it can be long-running and must be preceded by review of the discovered runtime database hash scope. Manual runtime, launcher, accessibility, responsive, mining, Teaching, and shutdown evidence remains operator-observed in the accompanying worksheet.

No production behavior, backend code, database, or launcher is changed by this milestone.
