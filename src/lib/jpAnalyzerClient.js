/**
 * JP Analyzer browser client.
 *
 * Phase 1:
 * - Check service health.
 * - Analyze a sentence on demand from Debug Mode.
 * - Validate exact source text and resolved-span offsets.
 *
 * This module does not replace Kuromoji or alter reader colouring.
 */

const DEFAULT_BASE_URL = '/api/jp-analyzer';
const DEFAULT_TIMEOUT_MS = 30_000;

export class JpAnalyzerError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'JpAnalyzerError';
    this.details = details;
  }
}

function createRequestSignal(timeoutMs, externalSignal) {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort(
      new DOMException(
        `JP Analyzer request exceeded ${timeoutMs} ms.`,
        'TimeoutError'
      )
    );
  }, timeoutMs);

  function forwardAbort() {
    controller.abort(
      externalSignal?.reason ??
        new DOMException('Request cancelled.', 'AbortError')
    );
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      forwardAbort();
    } else {
      externalSignal.addEventListener('abort', forwardAbort, {
        once: true
      });
    }
  }

  return {
    signal: controller.signal,
    dispose() {
      window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', forwardAbort);
    }
  };
}

async function requestJson(
  path,
  {
    baseUrl = DEFAULT_BASE_URL,
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal
  } = {}
) {
  const requestSignal = createRequestSignal(
    timeoutMs,
    signal
  );

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      signal: requestSignal.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined
          ? {
              'Content-Type':
                'application/json; charset=utf-8'
            }
          : {})
      },
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined
    });

    const responseText = await response.text();
    let payload = null;

    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new JpAnalyzerError(
          'JP Analyzer returned a non-JSON response.',
          {
            path,
            status: response.status,
            responsePreview: responseText.slice(0, 500)
          }
        );
      }
    }

    if (!response.ok) {
      throw new JpAnalyzerError(
        `JP Analyzer request failed with HTTP ${response.status}.`,
        {
          path,
          status: response.status,
          statusText: response.statusText,
          payload
        }
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof JpAnalyzerError) {
      throw error;
    }

    const reason = requestSignal.signal.reason;

    if (reason?.name === 'TimeoutError') {
      throw new JpAnalyzerError(
        'JP Analyzer request timed out.',
        {
          path,
          timeoutMs,
          cause: error
        }
      );
    }

    if (error?.name === 'AbortError') {
      throw new JpAnalyzerError(
        'JP Analyzer request was cancelled.',
        {
          path,
          cause: error
        }
      );
    }

    throw new JpAnalyzerError(
      'JP Analyzer is unavailable or could not be reached.',
      {
        path,
        cause: error
      }
    );
  } finally {
    requestSignal.dispose();
  }
}

export async function getAnalyzerHealth(options = {}) {
  return requestJson('/health', options);
}

export async function getAnalyzerOpenApi(options = {}) {
  return requestJson('/openapi.json', options);
}

export async function discoverAnalyzerRoutes(options = {}) {
  const openApi = await getAnalyzerOpenApi(options);

  const routes = Object.entries(openApi?.paths ?? {})
    .map(([path, definitions]) => ({
      path,
      methods: Object.keys(definitions ?? {})
        .map((method) => method.toUpperCase())
        .sort()
    }))
    .sort((left, right) =>
      left.path.localeCompare(right.path)
    );

  return {
    title: openApi?.info?.title ?? '',
    version: openApi?.info?.version ?? '',
    routes
  };
}

export function validateCompactAnalysis(
  compact,
  expectedText
) {
  const sourceText = String(expectedText ?? '');
  const errors = [];

  if (!compact || typeof compact !== 'object') {
    return {
      valid: false,
      errors: ['Compact analysis is not an object.']
    };
  }

  if (compact.text !== sourceText) {
    errors.push(
      'Compact analysis text differs from source text.'
    );
  }

  if (!Array.isArray(compact.resolvedSpans)) {
    errors.push(
      'resolvedSpans is missing or is not an array.'
    );

    return {
      valid: false,
      errors
    };
  }

  let previousEnd = 0;

  compact.resolvedSpans.forEach((span, index) => {
    const label = `resolvedSpans[${index}]`;

    if (!Number.isInteger(span?.start)) {
      errors.push(`${label}.start is not an integer.`);
      return;
    }

    if (!Number.isInteger(span?.end)) {
      errors.push(`${label}.end is not an integer.`);
      return;
    }

    if (
      span.start < 0 ||
      span.end <= span.start ||
      span.end > sourceText.length
    ) {
      errors.push(`${label} has an invalid source range.`);
      return;
    }

    if (span.start < previousEnd) {
      errors.push(
        `${label} overlaps the previous span or is out of order.`
      );
    }

    const expectedSurface = sourceText.slice(
      span.start,
      span.end
    );

    if (span.surface !== expectedSurface) {
      errors.push(
        `${label}.surface does not match its source range.`
      );
    }

    if (
      typeof span.role !== 'string' ||
      !span.role.trim()
    ) {
      errors.push(`${label}.role is missing.`);
    }

    previousEnd = Math.max(previousEnd, span.end);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export async function analyzeSentence(
  text,
  options = {}
) {
  const sourceText = String(text ?? '');

  if (!sourceText.trim()) {
    throw new JpAnalyzerError(
      'Cannot analyze an empty sentence.'
    );
  }

  const compact = await requestJson('/analyze', {
    ...options,
    method: 'POST',
    body: {
      text: sourceText
    }
  });

  const validation = validateCompactAnalysis(
    compact,
    sourceText
  );

  if (!validation.valid) {
    throw new JpAnalyzerError(
      'JP Analyzer returned an invalid compact analysis.',
      {
        validationErrors: validation.errors
      }
    );
  }

  return compact;
}