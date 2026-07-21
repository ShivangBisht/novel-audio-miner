import { useMemo, useState } from 'react';
import {
  discoverAnalyzerRoutes,
  getAnalyzerHealth
} from '../lib/jpAnalyzerClient.js';

export default function JpAnalyzerIntegrationPanel({
  currentData,
  shadowState,
  adaptedResult,
  comparison,
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
      <summary>JP Analyzer readerSpans — Phase 3A</summary>

      <div className="debug-empty">
        JP Analyzer runs automatically for the active sentence.
        The optional preview renders authoritative readerSpans.
        Comprehension, New Words and mining remain on Kuromoji.
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
          label="Reader spans"
          value={result?.readerSpans?.length ?? '-'}
        />

        <MiniValue
          label="Reader schema"
          value={result?.readerSpanSchemaVersion ?? '-'}
        />

        <MiniValue
          label="Resolved spans (legacy)"
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
      {adaptedResult && (
  <details className="debug-nested" open>
    <summary>
      Authoritative readerSpans adapter — Phase 3A
    </summary>

    <div className="debug-summary-grid">
      <MiniValue
        label="Adapter valid"
        value={String(
          adaptedResult.valid ?? false
        )}
      />

      <MiniValue
        label="Reader spans"
        value={
          adaptedResult.words?.length ?? 0
        }
      />

      <MiniValue
        label="Adapter errors"
        value={
          adaptedResult.errors?.length ?? 0
        }
      />

      <MiniValue
        label="Lexical"
        value={
          adaptedResult.summary?.lexical ?? '-'
        }
      />

      <MiniValue
        label="Names"
        value={
          adaptedResult.summary?.names ?? '-'
        }
      />

      <MiniValue
        label="Grammar"
        value={
          adaptedResult.summary?.grammar ?? '-'
        }
      />

      <MiniValue
        label="Corrected"
        value={
          adaptedResult.summary?.corrected ?? '-'
        }
      />

      <MiniValue
        label="Unresolved"
        value={
          adaptedResult.summary?.unresolved ?? '-'
        }
      />
    </div>

    {adaptedResult.errors?.length > 0 && (
      <pre>
        {adaptedResult.errors.join('\n')}
      </pre>
    )}
  </details>
)}
{comparison && (
  <details className="debug-nested" open>
    <summary>
      Kuromoji vs JP Analyzer comparison
    </summary>

    <div className="debug-summary-grid">
      <MiniValue
        label="Range agreement"
        value={`${(
          comparison.exactRangeAgreement * 100
        ).toFixed(1)}%`}
      />

      <MiniValue
        label="Exact boundaries"
        value={
          comparison.exactRangeMatchCount
        }
      />

      <MiniValue
        label="Category differences"
        value={
          comparison.categoryDifferenceCount
        }
      />

      <MiniValue
        label="Headword differences"
        value={
          comparison.headwordDifferenceCount
        }
      />

      <MiniValue
        label="Kuromoji-only"
        value={comparison.kuromojiOnlyCount}
      />

      <MiniValue
        label="Analyzer-only"
        value={comparison.analyzerOnlyCount}
      />

      <MiniValue
        label="Kuromoji range errors"
        value={comparison.kuromojiRangeErrors}
      />

      <MiniValue
        label="Analyzer range errors"
        value={comparison.analyzerRangeErrors}
      />
    </div>

    <details className="debug-nested">
      <summary>Model summaries</summary>

      <pre>
        {JSON.stringify(
          {
            kuromoji: comparison.kuromoji,
            analyzer: comparison.analyzer
          },
          null,
          2
        )}
      </pre>
    </details>

    {comparison.categoryDifferences.length > 0 && (
      <details className="debug-nested">
        <summary>
          Category differences (
          {comparison.categoryDifferences.length})
        </summary>

        <pre>
          {JSON.stringify(
            comparison.categoryDifferences,
            null,
            2
          )}
        </pre>
      </details>
    )}

    {comparison.headwordDifferences.length > 0 && (
      <details className="debug-nested">
        <summary>
          Frequency/headword key differences (
          {comparison.headwordDifferences.length})
        </summary>

        <pre>
          {JSON.stringify(
            comparison.headwordDifferences,
            null,
            2
          )}
        </pre>
      </details>
    )}

    {comparison.kuromojiOnly.length > 0 && (
      <details className="debug-nested">
        <summary>
          Kuromoji-only ranges (
          {comparison.kuromojiOnly.length})
        </summary>

        <pre>
          {JSON.stringify(
            comparison.kuromojiOnly,
            null,
            2
          )}
        </pre>
      </details>
    )}

    {comparison.analyzerOnly.length > 0 && (
      <details className="debug-nested">
        <summary>
          Analyzer-only ranges (
          {comparison.analyzerOnly.length})
        </summary>

        <pre>
          {JSON.stringify(
            comparison.analyzerOnly,
            null,
            2
          )}
        </pre>
      </details>
    )}
  </details>
)}
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