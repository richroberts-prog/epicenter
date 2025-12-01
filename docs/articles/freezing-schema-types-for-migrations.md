# Freezing Your Types and Schemas for Local-First Database Migrations

While working on IndexedDB migrations in a local-first app, I ran into a subtle issue: the schema types for each migration version were derived from the current types, and when the current types changed, all the historical schema definitions silently drifted.

## The Problem

Here's what I had:

```typescript
// Current Recording type (changes over time)
export type Recording = {
  id: string;
  transcript: string; // Was 'transcribedText' before
  version: 7;         // Didn't exist before
  // ...
};

// Historical schema derived from current type
export type RecordingV6 = Omit<Recording, 'transcript' | 'version'> & {
  transcribedText: string;
};
```

This looks clever. V6 is "the current type minus the new fields, plus the old field." But it's fragile.

When I renamed `transcribedText` to `transcript` and added `version` in Recording, the `Omit<..., 'transcript' | 'version'>` derivation broke subtly in RecordingV6. The derived type RecordingV6 was no longer an accurate snapshot of what V6 data actually looked like.

## The Solution: Freeze Historical Types

Each schema version should be a complete, self-contained definition. Don't derive from current types.

```typescript
// ============================================================================
// VERSION 6 (FROZEN)
// ============================================================================

/**
 * V6: Original schema with 'transcribedText' field.
 * Old data has no version field, so we default to 6.
 *
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

export type RecordingV6 = typeof RecordingV6.infer;

// ============================================================================
// VERSION 7 (CURRENT)
// ============================================================================

/**
 * V7: Renamed 'transcribedText' to 'transcript'.
 *
 * CURRENT VERSION: This is the latest schema.
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

export type RecordingV7 = typeof RecordingV7.infer;
```

Yes, this means copying fields across multiple definitions. That's the point.

## The Migration Validator

With frozen types, you can build a migrating validator that accepts either version and always outputs the latest:

```typescript
/**
 * Recording validator with automatic migration.
 *
 * Input: Raw object with either V6 fields (transcribedText) or V7 fields (transcript).
 *        If version is missing, defaults to 6.
 *
 * Output: Always returns the latest schema (V7) with 'transcript' field.
 *         V6 inputs are automatically migrated via the .pipe() transformation.
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

The `.or()` accepts either shape. The `.pipe()` normalizes everything to V7. Your app code only ever sees the latest type. (I wrote more about this pattern in [Migrate-on-Read: Schema Versioning with Arktype](./migrate-on-read-with-arktype.md).)

## The Pattern

1. When you create a new schema version, copy the current definition verbatim
2. Mark it as FROZEN with a comment
3. Never derive historical types from current types
4. Use `.or().pipe()` to build a migrating validator
5. Accept the duplication; it's intentional

The lesson: Schema migrations deal with historical data. Historical types should be historical facts, not derived computations that drift when the present changes.
