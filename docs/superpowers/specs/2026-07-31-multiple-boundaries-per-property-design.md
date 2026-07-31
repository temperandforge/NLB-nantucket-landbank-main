# Assign multiple boundaries to one property

## Problem

`project.boundaryId` is a single string naming one feature in the shared boundary GeoJSON file. A
real property can span more than one parcel/track in the client's file (e.g. a conservation area
made of several adjacent, disjoint shapes) — today that can only be represented by picking one and
leaving the rest unassigned.

## Decisions

- **`boundaryId` (string) is replaced by `boundaryIds` (array of strings)**, not kept alongside a
  second field. One field, one concept — every project has a list of boundary ids (possibly a
  single item), so there is never a question of which of two fields holds "the" boundary.
- **Existing data is migrated, not left to rot.** A one-off idempotent script converts every
  project's `boundaryId: "track_7"` into `boundaryIds: ["track_7"]`, then unsets the old field.
- **The picker keeps its current search/validation experience, per row.** A new array-level
  input component, `BoundaryIdsInput.tsx`, replaces `BoundaryIdInput.tsx`. Each row is the same
  searchable autocomplete (reads the uploaded file, offers real identifiers, flags an id that is
  no longer in the file) that exists today, with an "Add boundary" control to add a row and a
  "Remove" per row.
- **A boundary id already used by another project is flagged.** The input queries every other
  project's `boundaryIds` (excluding the document being edited) and warns, per row, if the id
  picked is already claimed elsewhere. This is new — the single-value field never had this check.
  Picking an id already present in the *same* property's own list is simply disallowed by the
  picker (no duplicate rows).
- **A property's polygons on the map are the union of all its assigned boundaries.** Clicking any
  one of them opens that property's popup (identical content, reusing the existing
  `projectByFeatureIdRef` lookup — it already maps a numeric feature id to a full `Project`, so
  multiple feature ids pointing at the same project needs no new mechanism, just populating it
  more than once per project).
- **The temporary all-boundaries amber layer excludes every id in a project's `boundaryIds`**, not
  just a single id — same mechanism as today (`assignedBoundaryIds`), just fed from an array.

## Design

### Schema — `studio/src/schemaTypes/documents/project.ts`

- `boundaryId: string` → `boundaryIds: array of {type: 'string'}` (`defineArrayMember`).
- `components: {input: BoundaryIdsInput}` (new component, replacing `BoundaryIdInput`).
- Preview `subtitle` currently reads `boundaryId ? "Boundary: ${boundaryId}" : "No boundary
  assigned"` — changes to reflect a count: `boundaryIds?.length ? "N boundary/boundaries" : "No
  boundary assigned"`.

### Studio input — `studio/src/components/BoundaryIdsInput.tsx` (new, replaces `BoundaryIdInput.tsx`)

- Loads the boundary file exactly as `BoundaryIdInput` does today (same GROQ query for
  `boundaryData.asset->url` / `boundaryIdProperty`, same "no file uploaded yet" /
  "file has no matching property" notices).
- Additionally queries `*[_type == "project" && _id != $currentId]{boundaryIds}` to build a
  `Map<string boundaryId, project name>` for the cross-project uniqueness warning.
- Renders the current `boundaryIds` array as rows, each showing the same autocomplete UI
  `BoundaryIdInput` uses today (search, orphaned-value warning) plus, if the value collides with
  another project's, a warning naming that project. An "Add boundary" button appends an empty row;
  each row has a "Remove" button. Picking a value already present elsewhere in *this* property's
  own list is prevented by filtering it out of that row's own option list.

### Frontend — `frontend/app/map/MapboxMap.tsx`

- The per-project loop in `renderMarkersAndGeojson()` currently resolves at most one
  `boundary`/`featureId` per project. It changes to iterate `project.boundaryIds ?? []`: for each
  id that resolves in `boundaries`, push one feature (its own `featureId`) and call
  `projectByFeatureIdRef.current.set(featureId, project)` — so a project with three boundaries
  gets three polygons, each of which opens the same popup on click.
- `assignedBoundaryIds` (used to filter the temporary amber all-boundaries layer) adds every id
  in `project.boundaryIds`, not a single value.
- The disabled marker-building code (currently a comment, per the earlier "remove all markers for
  now" change) is updated in-place so its restoration guidance matches the new array shape,
  without re-enabling it.

### Frontend query/types — `frontend/sanity/lib/queries.ts`, generated types

- `projectsQuery`'s `boundaryId` projection becomes `boundaryIds`. Run `npm run sanity:typegen`
  after the schema change and commit the regenerated files, per project convention.

### Migration script — `studio/scripts/migrateBoundaryIdToBoundaryIds.ts`

- Idempotent: matched on "has `boundaryId` set and `boundaryIds` not yet set." A project already
  migrated (or created fresh with `boundaryIds`) is left untouched on a re-run.
- For each match: `set({boundaryIds: [boundaryId]})` then `unset(['boundaryId'])`, in one patch.
- `--dry` mode prints the plan (count of projects to migrate, a few sample ids) without writing.

### Documentation

- `docs/DECISIONS.md` §1.9 ("Boundary geometry lives in one file, not on the documents"): update
  "Each project stores only `boundaryId`, naming one feature in it" to describe the array.
- §1.11 ("The boundary picker reads the real file"): update the component name and field name
  referenced, and note the new cross-project uniqueness check as part of what it does.

## Testing/verification

No test framework exists in this repo. Verify by:

- Running the migration script with `--dry` first, reviewing the plan, then for real; confirming
  every existing project ends up with `boundaryIds` and no `boundaryId`.
- In Studio: adding a second boundary to a project, confirming the row-based picker works, and
  confirming the cross-project warning appears when picking an id another project already uses.
- `npx tsc --noEmit` in `studio`; `npm run sanity:typegen`, `npm run type-check`, `npm run lint` in
  `frontend`.
- On `/map`: confirming a project with multiple boundaries shows all of its polygons, and clicking
  any one opens that project's popup.

## Deferred / out of scope

- Re-enabling markers (tracked separately, already disabled for unrelated reasons).
- Preventing (rather than warning about) a boundary id used by two projects — a warning is
  sufficient for now; a hard validation error can be added later if double-assignment turns out to
  be a real problem in practice.
