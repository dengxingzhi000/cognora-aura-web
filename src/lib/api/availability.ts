import { toApiError } from "./envelope";

/**
 * Endpoints listed in docs/BACKEND_GAPS.md are not deployed yet. The gateway
 * answers 404 for an unknown route (and 405/501 when a route exists but the
 * method/feature is disabled), which the pages render as「暂不可用」instead of
 * an error state. Anything else (403, 5xx, network failures) is a real error.
 */
const UNAVAILABLE_STATUSES = new Set([404, 405, 501]);

export function isEndpointUnavailable(error: unknown): boolean {
  return UNAVAILABLE_STATUSES.has(toApiError(error).code);
}
