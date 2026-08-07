# Phase 12B.6 End-to-End Qualification

Phase 12B.6 consolidates the complete Reader analysis-prefetch program into two reproducible commands.

```powershell
npm.cmd run test:phase12b
npm.cmd run validate:phase12b
```

The test command runs B.1 through B.5, Phase 5 compatibility, and a production build. The validator checks the ten-sentence rolling window, five-sentence near-priority group, previous protection, single-worker scheduler, promotion and coalescing metrics, stale-plan removal, 50-entry bounded session cache, retirement of persistent sentence storage, privacy-safe observability, and the complete Phase 12B documentation set.

Final real-Reader qualification covers sequential reading, one-step backward navigation, a distant scene jump, a chapter jump, valid colourization, correction refresh, session replacement, and shutdown. JP Analyzer health must report persistent execution, worker generation 1, zero restarts, zero fresh fallbacks, and no last error. Shutdown must leave no listeners on ports 8766 or 5173 and no KWJA process chain.
