# Transformation Schema Versioning

## Status: Complete

## Summary

This document covers the implementation of schema versioning for TransformationStep and Transformation types, enabling migration from V1 (without Custom provider fields) to V2 (with Custom provider fields).

## Current Implementation

### Schema Types (transformations.ts)

V1 and V2 share base fields to avoid repetition while maintaining clear versioning.
When adding V3, either extend the base or define V3 from scratch if base fields change.

```
SHARED BASE FIELDS (frozen for V1/V2):
┌─────────────────────────────────────────────────────────────────┐
│ TransformationStepBaseFields: id, type, provider fields, etc.   │
│ TransformationBaseFields: id, title, description, timestamps    │
└─────────────────────────────────────────────────────────────────┘

STEP VERSION 1 (FROZEN):
┌─────────────────────────────────────────────────────────────────┐
│ TransformationStepV1 = { version: 1, ...BaseFields }            │
└─────────────────────────────────────────────────────────────────┘

STEP VERSION 2 (CURRENT):
┌─────────────────────────────────────────────────────────────────┐
│ TransformationStepV2 = { version: 2, ...BaseFields, Custom.* }  │
└─────────────────────────────────────────────────────────────────┘

TRANSFORMATION V1 (FROZEN):
┌─────────────────────────────────────────────────────────────────┐
│ TransformationV1 = { ...BaseFields, steps: TransformationStepV1[] }│
└─────────────────────────────────────────────────────────────────┘

TRANSFORMATION V2 (CURRENT):
┌─────────────────────────────────────────────────────────────────┐
│ TransformationV2 = { ...BaseFields, steps: TransformationStepV2[] }│
└─────────────────────────────────────────────────────────────────┘

MIGRATING TRANSFORMATION VALIDATOR (accepts any version, outputs V2):
┌─────────────────────────────────────────────────────────────────┐
│ Transformation = V1.or(V2).pipe() → V2                          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Types

| Type | Purpose | Exported? |
|------|---------|-----------|
| `TransformationStepV1` | FROZEN: Old step schema (version defaults to 1, no Custom fields) | No (internal) |
| `TransformationStepV2` | CURRENT: Latest step schema (version=2, has Custom fields) | No (internal) |
| `TransformationStep` | Type alias derived from `TransformationV2['steps'][number]` | Yes |
| `TransformationV1` | FROZEN: Transformation with V1 steps | Yes (type only) |
| `TransformationV2` | CURRENT: Transformation with V2 steps | Yes (type only) |
| `Transformation` | Migrating validator: V1.or(V2).pipe() → V2 | Yes |

Note: `TransformationStepV1` and `TransformationStepV2` are internal validators used to compose the `Transformation` migrating validator. They are not exported because external code should use `TransformationStep` (the current step type) or `TransformationV2['steps']` (when typing arrays).

### Version Field Behavior

- `TransformationStepV1`: `version: '1 = 1'` (arktype syntax for default)
- `TransformationStepV2`: `version: '2'` (literal 2)
- Old data without `version` field gets `version: 1` via arktype default
- Migration sets `version: 2` and adds Custom fields

**Is the version field worth it?** Yes. Without it, arktype would need to distinguish V1 from V2 by field presence. The explicit discriminator makes migration logic cleaner and more readable for a small cost (one number per step).

## Storage Backend Migration

### IndexedDB (web.ts)

**Mechanism:** Dexie V0.6 upgrade runs once

```typescript
// Read with old type (transformations containing V1 steps)
const transformations = await tx.table<TransformationV1>('transformations').toArray();

// Migrate steps
const updatedSteps = transformation.steps.map((step) => ({
  ...step,
  version: 2 as const,
  'prompt_transform.inference.provider.Custom.model': '',
  'prompt_transform.inference.provider.Custom.baseUrl': '',
}));

// Write with current type
await tx.table<Transformation>('transformations').update(id, { steps: updatedSteps });
```

**Note:** Dexie generics are type hints only; no runtime validation.

### File System (file-system.ts)

**Mechanism:** `Transformation` validator on every read (auto-migrates)

```typescript
const { data } = matter(content);
const validated = Transformation(data);  // V1 → V2 via .pipe()
```

**Behavior:**
- Old files (V1) are migrated in memory on read
- Persists to disk only when user saves
- No separate migration script needed

## Trade-offs Considered

### Version in Storage

| Approach | Pros | Cons |
|----------|------|------|
| Explicit version | Clear, easy to detect | Need migration script for files |
| Arktype defaults (current) | No file changes needed | Version is implicit |

**Decision:** Use arktype defaults. Files migrate lazily on edit.

### File Migration Strategy

| Strategy | Description | Chosen? |
|----------|-------------|---------|
| Lazy | Migrate on read, persist on save | Yes |
| Eager script | Walk all files, update immediately | No |
| Version file | Track schema version separately | No (overkill) |

## Files Changed

- `apps/whispering/src/lib/services/db/models/transformations.ts` - Schema definitions
- `apps/whispering/src/lib/services/db/models/index.ts` - Exports
- `apps/whispering/src/lib/services/db/web.ts` - Dexie V0.6 migration
- `apps/whispering/src/lib/services/db/file-system.ts` - Uses `Transformation` for reads

## Outstanding Questions

1. **Should we eagerly migrate existing markdown files?**
   - Currently: No, lazy migration via arktype is sufficient
   - Could add a one-time script if needed

2. **Do TransformationRuns need versioning?**
   - Not currently addressed
   - Steps in runs might reference old schema

3. **Testing the migration**
   - Need to test with actual V1 data in IndexedDB
   - Need to test with V1 markdown files

## Next Steps

- [ ] Test Dexie migration with existing data
- [ ] Verify arktype migration works for markdown files
- [ ] Consider if TransformationRuns need similar versioning
- [ ] Review whether Custom provider fields need additional validation

## Related Files

- `apps/whispering/src/lib/services/db/file-system.ts` - File system DB implementation
- `apps/whispering/src/lib/constants/inference.ts` - INFERENCE_PROVIDERS constant
- `apps/whispering/src/lib/settings/settings.ts` - Custom provider settings

## Review

### Changes Made

1. **Extracted shared base fields**

   `TransformationStepBaseFields` and `TransformationBaseFields` contain fields shared between V1 and V2. This avoids repetition while keeping the version-specific additions (Custom.model, Custom.baseUrl) separate.

   The bases are frozen for V1/V2. If V3 needs different base fields, either extend or create a new base.

2. **Renamed `TransformationMigrating` to `Transformation`**

   The main `Transformation` validator is `TransformationV1.or(TransformationV2).pipe(migrate)`, so transformations with V1 steps are auto-migrated to V2.

3. **Simplified type hierarchy**

   - `TransformationStepV1`, `TransformationStepV2`: Internal validators (not exported)
   - `TransformationStep`: Type alias derived from `TransformationV2['steps'][number]`
   - `TransformationV1`: FROZEN transformation with V1 steps (exported type only)
   - `TransformationV2`: CURRENT transformation with V2 steps (exported type only)
   - `Transformation`: Migrating validator V1.or(V2).pipe() → V2

4. **Made step types internal**

   The versioned step types (`TransformationStepV1`, `TransformationStepV2`) are now internal to `transformations.ts`. External code uses:
   - `TransformationStep` for individual step typing
   - `TransformationV2['steps']` for step array typing (e.g., in Dexie migrations)

### Design Philosophy

- Shared base fields reduce repetition while keeping versions explicit
- Both steps AND transformations have versioned types (V1, V2)
- Migration happens only at the `Transformation` level (not at step level)
- Version field is worth the small cost for explicit migration logic
- When adding step V3: extend base if fields are additive, or define from scratch if base changes
- When adding Transformation V3: create validator and update `Transformation = V1.or(V2).or(V3).pipe()`

### Implementation Summary

The schema versioning system now works as follows:

1. **IndexedDB (web)**: Dexie V0.6 migration runs once per user, reading old data as `TransformationV1`, adding version=2 and Custom fields to steps, then writing back
2. **File system (desktop)**: `Transformation` validator accepts V1 or V2 and outputs V2; old files migrate in memory and persist when user saves

### Remaining Considerations

The outstanding questions from the spec remain valid considerations for future work:
- TransformationRuns may need similar versioning if they store step snapshots
- Testing should be done with actual V1 data to verify the migration paths work correctly
