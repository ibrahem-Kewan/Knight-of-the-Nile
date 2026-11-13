// PR-11 deletion state helpers.
// Reads never filter on `deletion_requested_at` in SQL: selecting/filtering a column that
// does not exist yet (migration 0039 not applied) makes PostgREST fail the WHOLE query,
// which silently emptied every tournaments list. Selecting `*` and filtering here works
// both before and after the migration.

type MaybePending = { deletion_requested_at?: string | null } | null | undefined;

/** True when the creator asked for deletion and an admin has not decided yet. */
export const isPendingDeletion = (row: MaybePending): boolean => !!row?.deletion_requested_at;

/** Drops rows waiting for deletion approval (creator + public lists). */
export function withoutPendingDeletion<T>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((r) => !isPendingDeletion(r as MaybePending));
}
