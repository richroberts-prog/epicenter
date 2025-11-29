# Freezing Schema Types for Database Migrations

While working on IndexedDB migrations, I ran into a subtle bug: my schema types for each migration version were derived from the current types, so when the current types changed, all my historical schema definitions silently drifted.

## The Problem

Here's what I had:

```typescript
// Historical schema types derived from current type
export type RecordingsDbSchemaV5 = {
  recordings: Omit<RecordingStoredInIndexedDB, 'transcript' | 'version'> & {
    transcribedText: string;
  };
};
```

This looks clever. V5 is "the current type minus the new fields, plus the old field." But it's fragile.

When I renamed `transcribedText` to `transcript` and added `version`, the `Omit<...>` derivation broke subtly. The derived type was no longer an accurate snapshot of what V5 data actually looked like in the database.

## The Solution: Freeze Historical Types

Each schema version should be a complete, self-contained type definition. Don't derive from current types.

```typescript
// ============================================================================
// FROZEN SNAPSHOTS: Do not derive from current types!
// When Recording changes, these historical types must NOT change.
// ============================================================================

/**
 * Dexie v0.5: Recording with 'transcribedText' field.
 * FROZEN: Do not modify.
 */
export type RecordingsDbSchemaV5 = {
  recordings: {
    id: string;
    title: string;
    transcribedText: string;  // Old field name
    transcriptionStatus: 'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED';
    // ... all fields explicitly listed
  };
};
```

Yes, this means copying fields across multiple type definitions. That's the point.

## The Exception: Current Schema

The current schema version can derive from your runtime types, since they should match:

```typescript
// Current version can derive from the arktype validator
export type RecordingsDbSchemaV6 = {
  recordings: RecordingV7 & { serializedAudio: SerializedAudio | undefined };
};
```

But once you create a new version, freeze the old one as an explicit snapshot.

## The Pattern

1. When you create a new schema version, copy the current type definition verbatim
2. Mark it as FROZEN with a comment
3. Never derive historical types from current types
4. Accept the duplication; it's intentional

Schema migrations deal with historical data. Historical types should be historical facts, not derived computations that drift when the present changes.
