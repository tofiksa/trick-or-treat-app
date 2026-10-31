# Check-in photo geotagged filename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload check-in photos with flat storage keys `{sanitizedName}_{lat}_{lng}_{timestamp}.{ext}` using the uploader’s `users.name` and the check-in coordinates.

**Architecture:** Add a pure `buildPhotoFileName` helper under `lib/utils/`. Wire `CheckInButton.handlePhotoUpload` to pass check-in lat/lng, load `users.name`, and use the helper instead of `{userId}/{checkinId}/{timestamp}.{ext}`. No schema, bucket, or EXIF changes.

**Tech Stack:** Next.js client component, Supabase JS (auth + `users` select + storage), Vitest, existing `browser-image-compression`.

## Global Constraints

- Filename format: `{sanitizedName}_{lat}_{lng}_{timestamp}.{ext}` (flat path, no folder prefix).
- Lat/lng: 6 decimal places, from the successful check-in (not a second GPS call).
- Name: `users.name` for `user.id`; empty after sanitize → `bruker`.
- Sanitize: trim → NFD → strip combining marks → lowercase → non-`[a-z0-9_-]` runs → `_` → trim `_` edges.
- No EXIF, no standalone photo button, no DB migrations, no timeline UI changes.
- Spec: `docs/superpowers/specs/2026-10-31-photo-filename-geotag-design.md`
- Tests via `npm test` (vitest).

---

## File structure

| File | Responsibility |
|------|----------------|
| `lib/utils/photoFileName.ts` | `buildPhotoFileName` |
| `lib/utils/__tests__/photoFileName.test.ts` | Unit tests for naming rules |
| `components/CheckInButton.tsx` | Pass coords; fetch name; use helper for upload key |
| `components/__tests__/CheckInButton.photo.test.tsx` | Assert upload key matches geotagged pattern |

---

### Task 1: `buildPhotoFileName` helper

**Files:**
- Create: `lib/utils/photoFileName.ts`
- Create: `lib/utils/__tests__/photoFileName.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type BuildPhotoFileNameArgs = { userName: string; latitude: number; longitude: number; timestamp: number; ext: string }`
  - `buildPhotoFileName(args: BuildPhotoFileNameArgs): string`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { buildPhotoFileName } from '../photoFileName';

describe('buildPhotoFileName', () => {
  it('builds flat geotagged name from worked example', () => {
    expect(
      buildPhotoFileName({
        userName: 'Anna',
        latitude: 59.9139,
        longitude: 10.7522,
        timestamp: 1730390400000,
        ext: 'jpg',
      }),
    ).toBe('anna_59.913900_10.752200_1730390400000.jpg');
  });

  it('sanitizes spaces, specials, and accents', () => {
    expect(
      buildPhotoFileName({
        userName: 'Åse Marie!',
        latitude: 60.39299,
        longitude: 5.32415,
        timestamp: 1000,
        ext: 'jpeg',
      }),
    ).toBe('ase_marie_60.392990_5.324150_1000.jpeg');
  });

  it('falls back to bruker for empty name', () => {
    expect(
      buildPhotoFileName({
        userName: '   ',
        latitude: 1,
        longitude: 2,
        timestamp: 3,
        ext: 'png',
      }),
    ).toBe('bruker_1.000000_2.000000_3.png');
  });

  it('strips leading dots from ext if present', () => {
    expect(
      buildPhotoFileName({
        userName: 'Josef',
        latitude: 0,
        longitude: 0,
        timestamp: 9,
        ext: '.jpg',
      }),
    ).toBe('josef_0.000000_0.000000_9.jpg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/utils/__tests__/photoFileName.test.ts`  
Expected: FAIL (module not found / `buildPhotoFileName` undefined)

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/utils/photoFileName.ts
export type BuildPhotoFileNameArgs = {
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  ext: string;
};

function sanitizeUserName(userName: string): string {
  const slug = userName
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'bruker';
}

export function buildPhotoFileName({
  userName,
  latitude,
  longitude,
  timestamp,
  ext,
}: BuildPhotoFileNameArgs): string {
  const name = sanitizeUserName(userName);
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  const cleanExt = ext.replace(/^\.+/, '') || 'jpg';
  return `${name}_${lat}_${lng}_${timestamp}.${cleanExt}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/utils/__tests__/photoFileName.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/utils/photoFileName.ts lib/utils/__tests__/photoFileName.test.ts
git commit -m "feat(photos): add geotagged photo filename helper"
```

---

### Task 2: Wire `CheckInButton` + photo test assertion

**Files:**
- Modify: `components/CheckInButton.tsx`
- Modify: `components/__tests__/CheckInButton.photo.test.tsx`

**Interfaces:**
- Consumes: `buildPhotoFileName` from `@/lib/utils/photoFileName`
- Produces: uploads use flat geotagged keys; `handlePhotoUpload(checkinId, latitude, longitude)`

- [ ] **Step 1: Update photo test to require geotagged upload key**

In `CheckInButton.photo.test.tsx`:

1. Add mock chain for `users` name lookup used after auth in photo upload. The existing `from()` mock must support:
   - checkins path (unchanged)
   - photos insert (unchanged)
   - `from('users').select(...).eq(...).maybeSingle()` → `{ data: { name: 'Anna' }, error: null }`

2. Spy/capture `storage.from('candy-photos').upload` and assert the first argument equals:

```ts
'anna_59.900000_10.700000_0.jpg'
```

(system time is `0` in `beforeEach`; geolocation mock uses `59.9` / `10.7`; file name `photo.jpg`.)

3. Keep existing success-message timeout assertions.

Concrete mock sketch (adapt to existing mock shape):

```ts
const mockUpload = vi.fn().mockResolvedValue({ error: null });
const mockMaybeSingleUser = vi.fn().mockResolvedValue({
  data: { name: 'Anna' },
  error: null,
});

// createClientMock.storage.from returns { upload: mockUpload, getPublicUrl: ... }
// createClientMock.from routes by table name:
// - 'users' → { select, eq, maybeSingle: mockMaybeSingleUser }
// - 'checkins' / 'photos' → existing behavior
```

Add assertion after successful upload:

```ts
await waitFor(() => {
  expect(mockUpload).toHaveBeenCalled();
});
expect(mockUpload.mock.calls[0][0]).toBe('anna_59.900000_10.700000_0.jpg');
```

- [ ] **Step 2: Run photo test — expect FAIL** (still uploads `user-1/checkin-1/...`)

Run: `npm test -- components/__tests__/CheckInButton.photo.test.tsx`  
Expected: FAIL on upload key assertion

- [ ] **Step 3: Implement CheckInButton wiring**

1. Import `buildPhotoFileName`.
2. Change call site after confirm to:

```ts
handlePhotoUpload(checkin.id, latitude, longitude)
```

3. Change signature:

```ts
const handlePhotoUpload = async (
  checkinId: string,
  latitude: number,
  longitude: number,
) => {
```

4. After `getUser` succeeds in upload path, fetch name:

```ts
const { data: profile } = await supabase
  .from('users')
  .select('name')
  .eq('id', user.id)
  .maybeSingle();
const userName = profile?.name ?? '';
```

5. Replace fileName construction:

```ts
const fileExt = compressedFile.name.split('.').pop() || 'jpg';
const fileName = buildPhotoFileName({
  userName,
  latitude,
  longitude,
  timestamp: Date.now(),
  ext: fileExt,
});
```

Do not change compression, progress strings, storage bucket, or `photos` insert fields.

- [ ] **Step 4: Run photo + helper tests**

Run:

```bash
npm test -- lib/utils/__tests__/photoFileName.test.ts components/__tests__/CheckInButton.photo.test.tsx
```

Expected: PASS

- [ ] **Step 5: Typecheck + full suite**

```bash
npx tsc --noEmit
npm test
```

Expected: typecheck clean; all tests pass (ignore pre-existing lint noise if any).

- [ ] **Step 6: Commit**

```bash
git add components/CheckInButton.tsx components/__tests__/CheckInButton.photo.test.tsx
git commit -m "feat(photos): name uploads after user with geotag in filename"
```

---

## Self-review vs spec

| Spec requirement | Task |
|------------------|------|
| Flat `{name}_{lat}_{lng}_{timestamp}.{ext}` | Task 1 + 2 |
| Sanitize + `bruker` fallback | Task 1 |
| 6 decimal coords from check-in | Task 1 + 2 |
| Load `users.name` | Task 2 |
| No EXIF / schema / standalone button | (constraints — no tasks) |
| Unit tests for helper | Task 1 |
| Optional CheckInButton upload key assert | Task 2 |
