# Check-in photo: username + geotag filename

**Date:** 2026-10-31  
**Status:** Approved for planning  
**Approach:** Pure helper for filename + wire into existing `CheckInButton` upload

## Goal

Improve the existing post–check-in photo upload so storage objects are:

1. **Named after the uploader** — display name from `users.name`.
2. **Geotagged in the filename** — latitude and longitude from the check-in that triggered the upload.

Format (flat path, no folder prefix):

```text
{sanitizedName}_{lat}_{lng}_{timestamp}.{ext}
```

Example: `anna_59.913900_10.752200_1730390400000.jpg`

## Context

- Today: after successful check-in, optional photo via `<input type="file" accept="image/*" capture="environment">`, compress with `browser-image-compression`, upload to Supabase bucket `candy-photos`, insert `photos` row with `checkin_id` + `storage_url`.
- Current object key: `{user.id}/{checkinId}/{Date.now()}.{ext}` — opaque; GPS lives only on the `checkins` row.
- Storage policies allow authenticated INSERT with `true` (no path-prefix requirement).
- Photos remain linked to check-ins; timeline/results already show user + location via joins.

## Decisions

| Topic | Choice |
|--------|--------|
| Scope | Enhance existing check-in photo flow only |
| Filename | `{name}_{lat}_{lng}_{timestamp}.{ext}` |
| Path layout | Flat (bucket root), no `userId/` prefix |
| Name source | `users.name` for authenticated `user.id` |
| GPS source | Coordinates from the check-in that just succeeded (passed into upload; no second GPS call) |
| EXIF embedding | Out of scope |
| Standalone photo button | Out of scope |
| Schema / RLS / bucket | Unchanged |
| Missing name | Fallback slug `bruker` |

## Architecture

```
CheckInButton.handleCheckIn
  → insert checkin (lat, lng)
  → optional confirm → handlePhotoUpload(checkinId, latitude, longitude)
       → getUser + fetch users.name
       → compress file
       → buildPhotoFileName({ userName, latitude, longitude, timestamp, ext })
       → storage.upload(fileName, …)
       → photos.insert({ checkin_id, storage_url })
```

New module: `lib/utils/photoFileName.ts`  
Consumer: `components/CheckInButton.tsx` only for this feature.

## `buildPhotoFileName`

**Signature (conceptual):**

```ts
buildPhotoFileName({
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: number; // ms since epoch
  ext: string;
}): string
```

**Rules:**

1. Sanitize name: trim → Unicode NFD → strip combining marks → lowercase → replace any run of non-`[a-z0-9_-]` with a single `_` → trim `_` edges.
2. If result is empty → `bruker`.
3. Format lat/lng with **6 decimal places** (fixed).
4. Keep `ext` as provided (caller strips leading dots if needed); default caller uses compressed file extension or `jpg`.
5. Return exactly `{name}_{lat}_{lng}_{timestamp}.{ext}` with no path separators.

## `CheckInButton` changes

- Pass `latitude` and `longitude` from the successful check-in into `handlePhotoUpload`.
- After auth check in upload path, load `users.name` for `user.id` (`.maybeSingle()` / single select).
- Replace `${user.id}/${checkinId}/${Date.now()}.${fileExt}` with `buildPhotoFileName(...)`.
- Keep compression, progress UI, error messages, and `photos` insert as today.
- `checkinId` remains only for the DB foreign key, not the storage key.

## Error handling

- Network / auth / compression / storage errors: unchanged messaging.
- Missing or failed profile name fetch: use `bruker` and continue upload.
- Name collision across users: accepted; uniqueness relies on millisecond timestamp (flat path).

## Testing

**Confirmed seam:** `buildPhotoFileName` (unit tests with known literals).

Coverage:

- Happy path name + coords + timestamp + ext
- Spaces / special chars / accents → sanitized slug
- Empty / whitespace-only name → `bruker`
- Exact output string for a worked example

**Optional:** extend `CheckInButton.photo.test.tsx` so `storage.upload` receives a key matching the geotagged name pattern (requires mocking `users` select).

## Out of scope

- Writing GPS into image EXIF
- Separate “take photo” action without check-in
- DB columns on `photos` for lat/lng or uploader name
- Timeline / results UI changes
- Renaming or migrating existing storage objects

## Success criteria

1. New uploads use the agreed flat filename format with sanitized `users.name` and 6-decimal coordinates from the check-in.
2. Photo still appears in dashboard/timeline after upload (public URL + `photos` row).
3. Unit tests for `buildPhotoFileName` pass; existing check-in / photo feedback tests still pass.
