import { useEffect, useMemo, useState } from 'react';
import {
  analyzeSentence,
  discoverAnalyzerRoutes,
  getAnalyzerHealth
} from '../lib/jpAnalyzerClient.js';

export default function JpAnalyzerIntegrationPanel({
  currentData
}) {
  const [status, setStatus] = useState('not checked');
  const [health, setHealth] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);
  const [analysisSummary, setAnalysisSummary] =
    useState(null);
  const [error, setError] = useState('');

  const sentence = useMemo(
    () => String(currentData?.plainText ?? ''),
    [currentData?.plainText]
  );

  useEffect(() => {
    setAnalysisSummary(null);
    setError('');
  }, [sentence]);

  async function checkConnection() {
    setStatus('checking');
    setError('');

    try {
      const [healthResult, routesResult] =
        await Promise.all([
          getAnalyzerHealth(),
          discoverAnalyzerRoutes()
        ]);

      setHealth(healthResult);
      setServerInfo(routesResult);
      setStatus('available');
    } catch (caught) {
      setHealth(null);
      setServerInfo(null);
      setStatus('unavailable');
      setError(caught?.message ?? String(caught));
    }
  }

  async function inspectCurrentSentence() {
    if (!sentence.trim()) {
      return;
    }

    setStatus('analyzing');
    setError('');

    try {
      const startedAt = performance.now();
      const result = await analyzeSentence(sentence);
      const elapsedMs = performance.now() - startedAt;

      setAnalysisSummary({
        elapsedMs: Math.round(elapsedMs),
        sourceTextMatches: result.text === sentence,
        resolvedSpanCount:
          result.resolvedSpans?.length ?? 0,
        coverageComplete:
          result.coverage?.complete ?? null,
        kwjaAlignmentComplete:
          result.coverage?.kwjaAlignmentComplete ??
          null,
        unresolvedSpanCount:
          result.coverage?.unresolvedSpanCount ??
          null,
        diagnosticCount:
          result.diagnostics?.length ?? 0,
        topLevelKeys: Object.keys(result).sort(),
        roleCounts: countRoles(
          result.resolvedSpans ?? []
        )
      });

      setStatus('analysis received');
    } catch (caught) {
      setAnalysisSummary(null);
      setStatus('error');

      const validationErrors =
        caught?.details?.validationErrors;

      setError(
        validationErrors?.length
          ? `${caught.message}\n${validationErrors.join(
              '\n'
            )}`
          : caught?.message ?? String(caught)
      );
    }
  }

  return (
    <details className="debug-nested">
      <summary>JP Analyzer integration — Phase 1</summary>

      <div className="debug-empty">
        Diagnostic only. Kuromoji remains responsible for
        visible reader colouring, comprehension and New
        Words.
      </div>

      <div className="dictionary-import-row">
        <button
          type="button"
          className="secondary"
          onClick={checkConnection}
          disabled={status === 'checking'}
        >
          Check analyzer
        </button>

        <button
          type="button"
          className="secondary"
          onClick={inspectCurrentSentence}
          disabled={
            !sentence.trim() ||
            status === 'analyzing'
          }
        >
          Inspect current sentence
        </button>
      </div>

      <div className="debug-kv-list">
        <DebugValue label="Status" value={status} />

        <DebugValue
          label="Health"
          value={
            health
              ? JSON.stringify(health)
              : '-'
          }
        />

        <DebugValue
          label="Server"
          value={serverInfo?.title || '-'}
        />

        <DebugValue
          label="API version"
          value={serverInfo?.version || '-'}
        />

        <DebugValue
          label="Routes found"
          value={serverInfo?.routes?.length ?? '-'}
        />

        <DebugValue
          label="Request time"
          value={
            analysisSummary
              ? `${analysisSummary.elapsedMs} ms`
              : '-'
          }
        />

        <DebugValue
          label="Source text matches"
          value={
            analysisSummary
              ? String(
                  analysisSummary.sourceTextMatches
                )
              : '-'
          }
        />

        <DebugValue
          label="Resolved spans"
          value={
            analysisSummary?.resolvedSpanCount ?? '-'
          }
        />

        <DebugValue
          label="Coverage complete"
          value={
            analysisSummary
              ? String(
                  analysisSummary.coverageComplete
                )
              : '-'
          }
        />

        <DebugValue
          label="KWJA alignment"
          value={
            analysisSummary
              ? String(
                  analysisSummary
                    .kwjaAlignmentComplete
                )
              : '-'
          }
        />

        <DebugValue
          label="Unresolved spans"
          value={
            analysisSummary
              ?.unresolvedSpanCount ?? '-'
          }
        />

        <DebugValue
          label="Diagnostics"
          value={
            analysisSummary?.diagnosticCount ?? '-'
          }
        />
      </div>

      {serverInfo?.routes?.length > 0 && (
        <details className="debug-nested">
          <summary>
            Analyzer routes ({serverInfo.routes.length})
          </summary>
          <pre>
            {JSON.stringify(
              serverInfo.routes,
              null,
              2
            )}
          </pre>
        </details>
      )}

      {analysisSummary?.roleCounts && (
        <details className="debug-nested" open>
          <summary>Analyzer role counts</summary>
          <pre>
            {JSON.stringify(
              analysisSummary.roleCounts,
              null,
              2
            )}
          </pre>
        </details>
      )}

      {analysisSummary?.topLevelKeys?.length >
        0 && (
        <details className="debug-nested">
          <summary>Response keys</summary>
          <pre>
            {JSON.stringify(
              analysisSummary.topLevelKeys,
              null,
              2
            )}
          </pre>
        </details>
      )}

      {error && (
        <details className="debug-nested" open>
          <summary>Integration error</summary>
          <pre>{error}</pre>
        </details>
      )}
    </details>
  );
}

function DebugValue({ label, value }) {
  return (
    <div className="debug-kv">
      <span>{label}</span>
      <code>{String(value)}</code>
    </div>
  );
}

function countRoles(spans) {
  const counts = {};

  for (const span of spans) {
    const role = span?.role || 'missing';
    counts[role] = (counts[role] ?? 0) + 1;
  }

  return counts;
}