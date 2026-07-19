import { useMemo, useState } from 'react';
import {
  discoverAnalyzerRoutes,
  getAnalyzerHealth
} from '../lib/jpAnalyzerClient.js';

export default function JpAnalyzerIntegrationPanel({
  currentData,
  shadowState,
  onClearShadowCache
}) {
  const [connectionStatus, setConnectionStatus] =
    useState('not checked');
  const [health, setHealth] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);
  const [connectionError, setConnectionError] =
    useState('');

  const sentence = useMemo(
    () => String(currentData?.plainText ?? ''),
    [currentData?.plainText]
  );

  const result = shadowState?.result ?? null;
  const analysisError = shadowState?.error ?? null;

  const roleCounts = useMemo(
    () => countRoles(result?.resolvedSpans ?? []),
    [result]
  );

  async function checkConnection() {
    setConnectionStatus('checking');
    setConnectionError('');

    try {
      const [healthResult, routesResult] =
        await Promise.all([
          getAnalyzerHealth(),
          discoverAnalyzerRoutes()
        ]);

      setHealth(healthResult);
      setServerInfo(routesResult);
      setConnectionStatus('available');
    } catch (error) {
      setHealth(null);
      setServerInfo(null);
      setConnectionStatus('unavailable');
      setConnectionError(
        error?.message ?? String(error)
      );
    }
  }

  function clearCache() {
    onClearShadowCache?.();
  }

  return (
    <details className="debug-nested" open>
      <summary>JP Analyzer shadow mode — Phase 2</summary>

      <div className="debug-empty">
        JP Analyzer runs automatically for the active
        sentence. Kuromoji still controls all visible
        colouring, comprehension and New Words.
      </div>

      <div className="dictionary-import-row">
        <button
          type="button"
          className="secondary"
          onClick={checkConnection}
          disabled={connectionStatus === 'checking'}
        >
          Check analyzer
        </button>

        <button
          type="button"
          className="secondary"
          onClick={clearCache}
        >
          Clear analyzer shadow cache
        </button>
      </div>

      <div className="debug-summary-grid">
        <MiniValue
          label="Shadow status"
          value={shadowState?.status ?? 'idle'}
        />

        <MiniValue
          label="Result source"
          value={shadowState?.source ?? '-'}
        />

        <MiniValue
          label="Request time"
          value={
            shadowState?.elapsedMs == null
              ? '-'
              : `${shadowState.elapsedMs} ms`
          }
        />

        <MiniValue
          label="Resolved spans"
          value={result?.resolvedSpans?.length ?? '-'}
        />

        <MiniValue
          label="Coverage"
          value={
            result
              ? String(
                  result.coverage?.complete ?? false
                )
              : '-'
          }
        />

        <MiniValue
          label="KWJA alignment"
          value={
            result
              ? String(
                  result.coverage
                    ?.kwjaAlignmentComplete ?? false
                )
              : '-'
          }
        />

        <MiniValue
          label="Unresolved"
          value={
            result
              ? result.coverage
                  ?.unresolvedSpanCount ?? '-'
              : '-'
          }
        />

        <MiniValue
          label="Diagnostics"
          value={
            result
              ? result.diagnostics?.length ?? 0
              : '-'
          }
        />
      </div>

      <details className="debug-nested">
        <summary>Connection details</summary>

        <div className="debug-kv-list">
          <DebugValue
            label="Connection"
            value={connectionStatus}
          />

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
            label="Routes"
            value={serverInfo?.routes?.length ?? '-'}
          />
        </div>

        {serverInfo?.routes?.length > 0 && (
          <pre>
            {JSON.stringify(
              serverInfo.routes,
              null,
              2
            )}
          </pre>
        )}

        {connectionError && (
          <pre>{connectionError}</pre>
        )}
      </details>

      {result && (
        <>
          <details className="debug-nested" open>
            <summary>Analyzer role counts</summary>
            <pre>
              {JSON.stringify(roleCounts, null, 2)}
            </pre>
          </details>

          <details className="debug-nested">
            <summary>Shadow validation</summary>

            <div className="debug-kv-list">
              <DebugValue
                label="Source text matches"
                value={String(
                  result.text === sentence
                )}
              />

              <DebugValue
                label="Schema"
                value={result.schemaVersion ?? '-'}
              />

              <DebugValue
                label="Analyzer"
                value={result.analyzerVersion ?? '-'}
              />

              <DebugValue
                label="Engine"
                value={result.engineVersion ?? '-'}
              />

              <DebugValue
                label="Cache key"
                value={
                  shadowState?.cacheKey
                    ? shadowState.cacheKey.slice(0, 16)
                    : '-'
                }
              />
            </div>
          </details>
        </>
      )}

      {analysisError && (
        <details className="debug-nested" open>
          <summary>Shadow analysis error</summary>
          <pre>
            {formatError(analysisError)}
          </pre>
        </details>
      )}
    </details>
  );
}

function MiniValue({ label, value }) {
  return (
    <div className="debug-mini-card">
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
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

function formatError(error) {
  const parts = [
    error?.message ?? String(error)
  ];

  const validationErrors =
    error?.details?.validationErrors;

  if (validationErrors?.length) {
    parts.push(...validationErrors);
  }

  return parts.join('\n');
}