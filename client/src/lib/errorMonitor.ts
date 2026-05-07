/**
 * Lightweight Error Monitoring for Production
 * Captures unhandled errors and promise rejections,
 * batches them, and sends to server endpoint.
 */

interface ErrorReport {
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  url: string;
  userAgent: string;
  timestamp: number;
  type: 'error' | 'unhandledrejection' | 'resource';
}

const ERROR_ENDPOINT = '/api/trpc/system.reportError';
const BATCH_INTERVAL = 10000; // 10 seconds
const MAX_BATCH_SIZE = 20;
const MAX_ERRORS_PER_SESSION = 50;

let errorQueue: ErrorReport[] = [];
let errorCount = 0;
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function createReport(
  type: ErrorReport['type'],
  message: string,
  stack?: string,
  source?: string,
  lineno?: number,
  colno?: number
): ErrorReport {
  return {
    message: message.slice(0, 500), // Truncate long messages
    stack: stack?.slice(0, 2000),
    source,
    lineno,
    colno,
    url: window.location.href,
    userAgent: navigator.userAgent.slice(0, 200),
    timestamp: Date.now(),
    type,
  };
}

function flushErrors() {
  if (errorQueue.length === 0) return;

  const batch = errorQueue.splice(0, MAX_BATCH_SIZE);

  // Use sendBeacon for reliability (works even during page unload)
  const payload = JSON.stringify({ errors: batch });
  
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/error-reports', payload);
    } else {
      fetch('/api/error-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {}); // Silently fail
    }
  } catch {
    // Never let error reporting cause errors
  }
}

function queueError(report: ErrorReport) {
  if (errorCount >= MAX_ERRORS_PER_SESSION) return;
  errorCount++;
  errorQueue.push(report);

  if (errorQueue.length >= MAX_BATCH_SIZE) {
    flushErrors();
  } else if (!batchTimer) {
    batchTimer = setTimeout(() => {
      batchTimer = null;
      flushErrors();
    }, BATCH_INTERVAL);
  }
}

export function initErrorMonitor() {
  // Only enable in production
  if (import.meta.env.DEV) return;

  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    // Skip resource loading errors (images, scripts from CDN)
    if (event.target && (event.target as HTMLElement).tagName) return;

    queueError(createReport(
      'error',
      event.message || 'Unknown error',
      event.error?.stack,
      event.filename,
      event.lineno,
      event.colno
    ));
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason) || 'Unhandled promise rejection';
    const stack = reason?.stack;

    queueError(createReport('unhandledrejection', message, stack));
  });

  // Flush on page unload
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushErrors();
    }
  });

  // Catch resource loading errors (broken scripts/CSS)
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;
    if (target && target.tagName && ['SCRIPT', 'LINK'].includes(target.tagName)) {
      const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href;
      queueError(createReport('resource', `Failed to load: ${src}`, undefined, src));
    }
  }, true); // Use capture phase for resource errors

  console.log('[ErrorMonitor] Initialized');
}
