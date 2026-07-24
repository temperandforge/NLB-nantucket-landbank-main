# Nantucket Land Bank — Domain Glossary

The ubiquitous language for this repo's frontend and design system, including how Figma design names map to code names.

## Language

**Design Token**:
A named, reusable design value (color, spacing, font size, etc.) defined once and referenced everywhere it applies. In this repo, design tokens live in the Tailwind `@theme` block in `frontend/css/globals.css`; Figma variables of the same purpose are reconciled against these via the mapping table below.
_Avoid_: Style variable, theme variable

**Figma↔Code Name Mapping**:
The record of where a Figma design element's name differs from its corresponding code identifier (Tailwind token or component name). Code naming is canonical; when Figma and code names diverge, the Figma name is tracked here rather than renaming the existing code token to match Figma.
_Avoid_: Design-code sync, token alias

## Figma ↔ Code Name Mapping

| Figma name | Code name | Notes |
|---|---|---|
| _(populated by `/figma-sync` as components/tokens are mapped)_ | | |
