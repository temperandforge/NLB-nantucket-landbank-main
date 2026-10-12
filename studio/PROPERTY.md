# Property Setup

Documentation for the Property content model in this Sanity Studio. Keep this file updated as the Property schema evolves.

## Document types

All three live under `studio/src/schemaTypes/documents/` and are registered in `studio/src/schemaTypes/index.ts`.

### `property`
The main entry (`studio/src/schemaTypes/documents/property.ts`). Fields:

- `name` (string, required)
- `slug` (slug, required, derived from `name`)
- `propertyTypes` (array of references to `propertyType`, required, min 1) — every property must be classified under at least one Property Type.
- `resources` (array of references to `resource`, required, min 1) — every property must have at least one attached Resource.
- `description` (text, optional)

### `propertyType`
Taxonomy for classifying properties, e.g. "Conservation Land", "Affordable Housing", "Open Space" (`studio/src/schemaTypes/documents/propertyType.ts`). Fields: `title`, `description`.

### `resource`
A file or link attached to one or more properties, e.g. deed restrictions, management plans, maps (`studio/src/schemaTypes/documents/resource.ts`). Fields: `title`, `file`, `url`.

## Relationships

`property` documents hold arrays of references out to `propertyType` and `resource`. Both `propertyType` and `resource` are independent, reusable documents — the same Property Type or Resource can be attached to many properties.

```
property --references[]--> propertyType
property --references[]--> resource
```

## Studio sidebar

Configured in `studio/src/structure/index.ts`. All three types are excluded from the default flat document list (`DISABLED_TYPES`) and instead nested under a single **Property** section:

```
Property
├── Properties       (property documents)
├── ──────────
├── Property Types    (propertyType documents)
└── Resources         (resource documents)
```

## Adding fields later

When extending `property`, `propertyType`, or `resource` with new fields, prefer additive changes. If renaming or removing a field that may already hold data, follow the deprecation lifecycle (`deprecated` → `readOnly` → `hidden` → remove) documented in the Sanity schema best-practices guide before deleting anything.
