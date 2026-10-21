export class RequestTimeoutError extends Error {
  constructor() { super('The server took too long to respond. Please try again.'); this.name = 'RequestTimeoutError'; }
}

/**
 * Bound both the response headers and body so a stalled request cannot leave
 * an action disabled forever. Aborting a write does not mean it was rolled back;
 * callers recover the saved state before retrying.
 * @param {string} path
 * @param {RequestInit} options
 * @param {number} timeoutMs
 */
export async function requestJson(path, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) forwardAbort();
  else options.signal?.addEventListener('abort', forwardAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new RequestTimeoutError()), timeoutMs);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal });
    const data = await response.json().catch(error => {
      if (controller.signal.aborted) throw error;
      return {};
    });
    return { response, data };
  } catch (error) {
    if (controller.signal.reason instanceof RequestTimeoutError) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', forwardAbort);
  }
}
