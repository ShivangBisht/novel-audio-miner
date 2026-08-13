# Phase 14 Architecture Overview

## Purpose

Phase 14 adds contextual Reader scenes while preserving authoritative logical sentence ownership for Teaching and all established analyzer contracts.

## Final architecture

```text
Authoritative EPUB runtime
  -> ordered text and image events
  -> atomic logical text ranges
  -> minimum-context planning
  -> markup-preserving contextual visual scenes
  -> Reader display and contextual Reader analysis
```

Teaching remains logically sentence-local:

```text
DOM visual selection
  -> visual offsets
  -> one logical sentence
  -> existing sentence-local analyzer record
  -> existing Teaching selection and analysis formats
  -> existing evidence, correction, decision, and corpus pipeline
```

## Production ownership

- `textRanges.js` owns atomic ranges and meaningful-character counting.
- `minimumContextPlanner.js` owns contextual attachment and hard-boundary rules.
- `markupRanges.js` owns markup-preserving visible-text slicing.
- `contextualScenes.js` owns qualified contextual Reader composition and logical sentence metadata.
- `logicalSentenceSelection.js` owns visual-range-to-logical-sentence mapping.
- `domVisualSelection.js` owns DOM-range-to-visual-offset mapping.
- `useJpAnalyzerShadow.js` owns visible-scene analysis and the sentence-local on-demand entry point, with one unchanged analyzer record contract.
- `teachingInputQualification.js` converts qualified logical selection and the existing analyzer record into the existing Teaching inputs.
- `Reader.jsx` coordinates the controlled runtime path.

## Preserved formal contracts

Phase 14 does not redefine JP Analyzer requests or records, reader spans, candidates, selection decisions, analyzer caching, correction revision, scheduling, prefetch, Teaching inputs, Teaching evidence, corrections, decisions, supersession, sentence hashes, corpus formats, or mining ownership.

## Historical milestone documents

Detailed Phase 14.1 through 14.6 documents remain tracked as implementation and qualification history. This overview is the consolidated production guide.
