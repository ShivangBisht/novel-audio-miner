# Alpha 10 Release Candidate Checklist

## Identity

- [ ] Frontend commit matches the Alpha 10 manifest.
- [ ] Backend commit matches the Alpha 10 manifest.
- [ ] Both repositories are clean and synchronized.

## Automated qualification

```powershell
Set-Location "D:\Mining\novel-audio-miner"
npm.cmd run test:alpha10
git diff --check

Set-Location "D:\Mining\JP analyzer"
& ".\.venv\Scripts\python.exe" -m pytest
```

- [ ] Frontend Alpha 1 through Alpha 10 gate passes.
- [ ] Production build passes.
- [ ] Backend supported suite passes with only documented skips.
- [ ] Test databases are temporary and authoritative dictionary and Teaching hashes are unchanged by read-only qualification.

## Runtime evidence

- [ ] Complete `docs/ALPHA10_RUNTIME_QUALIFICATION.md`.
- [ ] Record operator, timestamps, evidence paths, failures, and recovery results.
- [ ] Verify startup ownership, Reader, analyzer, known words, mining, Teaching, corrections, dictionary management, diagnostics, and shutdown.
- [ ] Do not mark unobserved checks as passed.

## Release decision

- [ ] Update the manifest only after automated, backend, runtime, shutdown, and repository checks pass.
- [ ] Record the Alpha 10 implementation commit and evidence digest.
- [ ] Keep rollback commits recorded.
- [ ] Push commits before creating a release tag.
