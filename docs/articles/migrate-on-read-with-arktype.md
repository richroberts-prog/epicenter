# Migrate-on-Read: Schema Versioning for Local-First Apps

I was building a local-first app where user data lives in markdown files on disk. New feature meant new fields. The typical response? Write a migration script that walks every file and updates the schema.

But here's the thing: the file system doesn't have a migration mechanism. There's no Dexie version number, no Prisma migrate, no Rails migration runner. Just files.

So I asked: what if I didn't migrate at all? What if I validated and migrated in one pass, on read?

## The Problem with Traditional Migrations

Traditional database migrations run once, update everything, and you're done. But for local-first apps with file-based storage:

1. You can't guarantee all files are migrated (user might have files synced from another device)
2. Batch migrations are expensive for large datasets
3. A migration script is another thing to maintain and test
4. If something goes wrong, you've corrupted the user's data

I wanted something simpler. Validate the data, migrate if needed, always get the latest version out.

## The Insight: Version Discriminators with Defaults

The key is arktype's default value syntax. When you write `version: '1 = 1'`, you're saying: "this field should be 1, and if it's missing, default to 1."

Old data doesn't have a version field. New data does. The default bridges the gap.

```typescript
// V1: Original schema (no version field in old data)
const TransformationStepV1 = TransformationStepBase.merge({
  version: '1 = 1',  // Default to 1 if missing
});

// V2: Added new fields
const TransformationStepV2 = TransformationStepBase.merge({
  version: '2',  // Explicit version, no default
  'provider.Custom.model': 'string',
  'provider.Custom.baseUrl': 'string',
});
```

See what's happening? V1 accepts data without a version field and assigns it `version: 1`. V2 requires `version: 2` explicitly. This gives us a clean discriminator for the union.

## The Pattern: .or().pipe()

Here's the migration validator:

```typescript
/**
 * Accepts V1 or V2, always outputs V2.
 */
export const TransformationStep = TransformationStepV1
  .or(TransformationStepV2)
  .pipe((step): TransformationStepV2 => {
    if (step.version === 1) {
      return {
        ...step,
        version: 2,
        'provider.Custom.model': '',
        'provider.Custom.baseUrl': '',
      };
    }
    return step;
  });
```

That's it. The validator:
1. Accepts V1 (with default version) OR V2 (explicit version)
2. Pipes the result through a transformation
3. Returns V2 in all cases

No separate migration script. No batch processing. Just read the file, get the latest version.

## How It Works in Practice

```typescript
// Reading a markdown file
const { data } = matter(fileContent);
const validated = Transformation(data);

if (validated instanceof type.errors) {
  // Handle validation error
  return;
}

// validated is always the latest version
// Old files are migrated in memory on read
```

The migration happens transparently. When the user edits and saves, the file is written with the new schema. Files migrate lazily as they're accessed.

## Why the Version Field is Worth It

You might wonder: can't arktype distinguish versions by field presence?

It can, but explicit version discriminators are cleaner:

1. **Readable migration logic**: `if (step.version === 1)` is clearer than checking for missing fields
2. **Future-proof**: Adding V3 is trivial; just add another version number
3. **Deterministic**: No ambiguity about which version you have
4. **Small cost**: One number per record is negligible

## Composing Validators

For nested structures, compose the validators:

```typescript
const TransformationV2 = TransformationBase.merge({
  steps: [TransformationStep, '[]'],  // Array of migrating validators
});

// Now the whole transformation migrates its steps automatically
const Transformation = TransformationBase.merge({
  steps: [TransformationStep, '[]'],
});
```

Each step in the array runs through the migration pipe. The parent doesn't need to know about versioning.

## When to Use This Pattern

This pattern works well when:

- **File-based storage**: No built-in migration mechanism
- **Lazy loading**: You don't need all data upfront
- **User-owned data**: Files might come from anywhere (sync, backup, manual edit)
- **Incremental changes**: Migrations are additive (new fields with defaults)

It's less suited for:

- **Destructive migrations**: Renaming fields, changing types
- **Database storage**: Use the database's migration system instead
- **Large structural changes**: Might be clearer as a batch script

## The Bigger Picture

This is part of a broader philosophy: validation and transformation are the same concern.

We don't have "raw data" and "validated data." We have data at different stages of a pipeline. Arktype's `.pipe()` makes that pipeline explicit.

The traditional approach separates concerns: parse JSON, validate shape, migrate schema, use data. Four steps.

The arktype approach unifies them: define what valid data looks like, including how to get there from older versions. One validator, one source of truth.

## What Actually Shipped

```typescript
// ============================================================================
// VERSION 1 (FROZEN)
// ============================================================================

const TransformationStepV1 = TransformationStepBase.merge({
  version: '1 = 1',
});

// ============================================================================
// VERSION 2 (CURRENT)
// ============================================================================

const TransformationStepV2 = TransformationStepBase.merge({
  version: '2',
  'prompt_transform.inference.provider.Custom.model': 'string',
  'prompt_transform.inference.provider.Custom.baseUrl': 'string',
});

// ============================================================================
// MIGRATING VALIDATORS
// ============================================================================

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

export type TransformationStep = TransformationStepV2;
```

The type exported is always the latest version. Consumers don't need to know about V1. They just get validated, migrated data.

The lesson: For local-first apps with file storage, migrate-on-read beats migrate-on-deploy. Let the validator be the migration. One pass, always current.
