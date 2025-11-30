# Migrate-on-Read: Schema Versioning with Arktype

In Epicenter, I use an arktype schema validator that validates the data, migrates if needed, and returns the latest version—all in one pass. This is parsing, not just validation.

## The Pattern: `.or().pipe()`

Here's a migrating validator from the actual codebase:

```typescript
/**
 * TransformationStep validator with automatic migration.
 * Accepts V1 or V2 and always outputs V2.
 */
export const TransformationStep = TransformationStepV1
  .or(TransformationStepV2)
  .pipe((step): TransformationStepV2 => {
    if (step.version === 1) {
      return {
        ...step,
        version: 2,
        'prompt_transform.inference.provider.Custom.model': '',
        'prompt_transform.inference.provider.Custom.baseUrl': '',
      };
    }
    return step;
  });

export type TransformationStep = typeof TransformationStep.infer;
```

That's it. The validator accepts V1 or V2, pipes through a transformation, and always outputs V2. The exported type is the latest version. Consumers never see V1.

## Version Discriminators with Defaults

The magic is in how each version is defined:

```typescript
// V1: Old data has no version field, so we default to 1
const TransformationStepV1 = TransformationStepBase.merge({
  version: '1 = 1',  // If missing, default to 1
});

// V2: New data has an explicit version
const TransformationStepV2 = TransformationStepBase.merge({
  version: '2',  // Must be exactly 2
  'prompt_transform.inference.provider.Custom.model': 'string',
  'prompt_transform.inference.provider.Custom.baseUrl': 'string',
});
```

When you write `version: '1 = 1'`, you're saying: "this field should be 1, and if it's missing, default to 1."

The user's existing data doesn't have a version field yet. The default bridges the gap. New data has `version: 2` explicitly. This gives us a clean discriminator for the union—arktype can tell which variant it's parsing and apply the right schema.

## Frozen Types

Each version definition is a complete, self-contained snapshot. You don't derive V1 from V2; you freeze V1 and never touch it again.

```typescript
// ============================================================================
// VERSION 1 (FROZEN)
// ============================================================================

/**
 * V1: Original schema without Custom provider fields.
 * FROZEN: Do not modify. This represents the historical V1 schema.
 */
const TransformationStepV1 = TransformationStepBase.merge({
  version: '1 = 1',
});

// ============================================================================
// VERSION 2 (CURRENT)
// ============================================================================

/**
 * V2: Added Custom provider fields for local LLM endpoints.
 */
const TransformationStepV2 = TransformationStepBase.merge({
  version: '2',
  'prompt_transform.inference.provider.Custom.model': 'string',
  'prompt_transform.inference.provider.Custom.baseUrl': 'string',
});
```

Yes, this means some duplication. That's the point. Historical types should be historical facts, not derived computations that drift when the present changes. (I wrote more about this in [Freezing Your Types for Migrations](./freezing-schema-types-for-migrations.md).)

## Why Not Traditional Migrations?

Traditional database migrations run once, update everything, and you're done. But Epicenter is a local-first app with file-based storage (markdown files on disk, IndexedDB). The file system doesn't have a migration mechanism. There's no Prisma migrate, no Rails migration runner. Just files.

The problems:

1. **You can't guarantee all files are migrated**—a user might have files synced from another device
2. **Batch migrations are expensive** for large datasets
3. **A migration script is another thing** to maintain and test
4. **If something goes wrong**, you've corrupted the user's data

So I asked: what if I didn't migrate at all? What if I validated and migrated in one pass, on read?

## In Practice

```typescript
// Reading and validating data
const validated = TransformationStep(rawData);

if (validated instanceof type.errors) {
  // Handle validation error
  return;
}

// validated is always the latest version (V2)
// Old data was migrated in memory during parsing
```

The migration happens transparently. When the user edits and saves, the data is written with the new schema. Records migrate lazily as they're accessed.

## Composing Validators

For nested structures, compose the migrating validators:

```typescript
export const Transformation = TransformationBase.merge({
  steps: [TransformationStep, '[]'],  // Array of migrating validators
});

export type Transformation = typeof Transformation.infer;
```

Each step in the array runs through the migration pipe. The parent doesn't need to know about versioning—it just uses the migrating `TransformationStep` validator, and each step comes out as V2.

## When This Works

This pattern works well when:

- **File-based or local storage**: No built-in migration mechanism
- **Lazy loading**: You don't need all data upfront
- **User-owned data**: Files might come from anywhere (sync, backup, manual edit)
- **Incremental changes**: Migrations are additive (new fields with defaults)

It's less suited for:

- **Destructive migrations**: Removing fields, changing types in breaking ways
- **Database storage**: Use the database's migration system instead
- **Large structural changes**: Might be clearer as a batch script

## The Bigger Picture

Validation and transformation are the same concern. We don't have "raw data" and "validated data." We have data at different stages of a pipeline. Arktype's `.pipe()` makes that pipeline explicit.

The traditional approach separates concerns: parse JSON, validate shape, migrate schema, use data. Four steps.

The arktype approach unifies them: define what valid data looks like, including how to get there from older versions. One validator, one source of truth.

The lesson: For local-first apps, migrate-on-read beats migrate-on-deploy. Let the validator be the migration.
