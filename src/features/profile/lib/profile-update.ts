import type { SelfProfileUpdateRequest } from "@/lib/api/contracts/system";

/**
 * `PUT /api/system/users/me` is a partial update: fields that are omitted stay
 * untouched, while an empty string is an explicit "clear". Only changed
 * whitelisted fields are sent so the backend never has to guess intent.
 */
export function diffProfile(
  current: SelfProfileUpdateRequest,
  next: SelfProfileUpdateRequest
): SelfProfileUpdateRequest {
  const diff: SelfProfileUpdateRequest = {};

  (Object.keys(next) as Array<keyof SelfProfileUpdateRequest>).forEach((key) => {
    const nextValue = next[key];
    if (nextValue === undefined) return;
    if (nextValue !== (current[key] ?? "")) {
      diff[key] = nextValue;
    }
  });

  return diff;
}
