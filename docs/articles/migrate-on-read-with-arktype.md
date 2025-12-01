# Migrate-on-Read: Schema Versioning with Arktype

In Epicenter, I use an arktype schema validator that validates the data, migrates if needed, and returns the latest version—all in one pass. This does parsing, not just validation (see "parse, don't validate" as a related concept).

## The Pattern: `.or().pipe()`

Here's a migrating validator from the actual codebase:

```typescript
/**
 * Recording validator with automatic migration.
 * Accepts V6 or V7 and always outputs V7.
 */
export const Recording = RecordingV6.or(RecordingV7).pipe(
  (recording): RecordingV7 => {
    if (recording.version === 6) {
      const { transcribedText, version: _version, ...rest } = recording;
      return {
        ...rest,
        version: 7,
        transcript: transcribedText,
      };
    }
    return recording;
  },
);

export type Recording = typeof Recording.infer;
```

That's it. The validator accepts V6 or V7, pipes through a transformation, and always outputs V7. The exported type is the latest version. Consumers never see V6.

## Version Discriminators with Defaults

The magic is in how each version is defined:

```typescript
// V6: Old data has no version field, so we default to 6
const RecordingV6 = type({
  version: '6 = 6',  // If missing, default to 6
  id: 'string',
  transcribedText: 'string',
  // ... other fields
});

// V7: New data has an explicit version
const RecordingV7 = type({
  version: '7',  // Must be exactly 7
  id: 'string',
  transcript: 'string',  // Renamed from transcribedText
  // ... other fields
});
```

When you write `version: '6 = 6'`, you're saying: "this field should be 6, and if it's missing, default to 6."

The user's existing data doesn't have a version field yet. The default bridges the gap. New data has `version: 7` explicitly. This gives us a clean discriminator for the union—arktype can tell which variant it's parsing and apply the right schema.

## Frozen Types

Each version definition is a complete, self-contained snapshot. You don't derive V6 from V7; you freeze V6 and never touch it again.

```typescript
// ============================================================================
// VERSION 6 (FROZEN)
// ============================================================================

/**
 * V6: Original schema with 'transcribedText' field.
 * FROZEN: Do not modify. This represents the historical V6 schema.
 */
const RecordingV6 = type({
  version: '6 = 6',
  id: 'string',
  title: 'string',
  subtitle: 'string',
  timestamp: 'string',
  createdAt: 'string',
  updatedAt: 'string',
  transcribedText: 'string',
  transcriptionStatus: '"UNPROCESSED" | "TRANSCRIBING" | "DONE" | "FAILED"',
});

// ============================================================================
// VERSION 7 (CURRENT)
// ============================================================================

/**
 * V7: Renamed 'transcribedText' to 'transcript'.
 */
const RecordingV7 = type({
  version: '7',
  id: 'string',
  title: 'string',
  subtitle: 'string',
  timestamp: 'string',
  createdAt: 'string',
  updatedAt: 'string',
  transcript: 'string',
  transcriptionStatus: '"UNPROCESSED" | "TRANSCRIBING" | "DONE" | "FAILED"',
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
const validated = Recording(rawData);

if (validated instanceof type.errors) {
  // Handle validation error
  return;
}

// validated is always the latest version (V7)
// Old data was migrated in memory during parsing
```

The migration happens transparently. When the user edits and saves, the data is written with the new schema. Records migrate lazily as they're accessed.

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
