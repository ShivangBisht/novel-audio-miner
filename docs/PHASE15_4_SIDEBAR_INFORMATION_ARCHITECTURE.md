# Phase 15.4 Sidebar Information Architecture

## Purpose

Phase 15.4 makes the default sidebar reading-focused while preserving configuration, dictionary, integration, and diagnostic capabilities in a temporary Tools surface pending the dedicated Phase 15.7 workspace.

## Reading sidebar

The default sidebar now contains five explicit groups:

- Book
- Navigation
- New Words
- Illustrations
- Display

Teaching Mode remains a Reader workflow control in the Display group.

## Temporary Tools surface

The following existing controls were moved out of the default sidebar without changing their state, handlers, clients, or persistence:

- dictionary management
- note type and colour-source configuration
- Nadeshiko session token
- cache controls
- force TTS
- Debug Mode and Debug Report
- parser-inventory and analyzer-cache diagnostics

The temporary Tools surface exists only to preserve reachability until Phase 15.7 replaces it with the full settings and administration workspace.

## Frozen behavior

No EPUB, contextual scene, logical sentence, analyzer, Teaching, known-word, mining, prefetch, cache, dictionary, diagnostics, or backend behavior changed.
