import { type } from 'arktype';

/**
 * The current version of the Recording schema.
 * Increment this when adding new fields or making breaking changes.
 *
 * Version history:
 * - V6: Original schema with 'transcribedText' field (implicit, no version field stored)
 * - V7: Renamed 'transcribedText' to 'transcript'
 */
export const CURRENT_RECORDING_VERSION = 7 as const;

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

type RecordingV6 = typeof RecordingV6.infer;

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
	/**
	 * Recording lifecycle status:
	 * 1. Begins in 'UNPROCESSED' state
	 * 2. Moves to 'TRANSCRIBING' while audio is being transcribed
	 * 3. Marked as 'DONE' when transcription completes
	 * 4. Marked as 'FAILED' if transcription fails
	 */
	transcriptionStatus: '"UNPROCESSED" | "TRANSCRIBING" | "DONE" | "FAILED"',
});

type RecordingV7 = typeof RecordingV7.infer;

// ============================================================================
// MIGRATING VALIDATOR
// ============================================================================

/**
 * Recording validator with automatic migration.
 *
 * Input: Raw object with either V6 fields (transcribedText) or V7 fields (transcript).
 *        If version is missing, defaults to 6.
 *
 * Output: Always returns the latest schema (V7) with 'transcript' field.
 *         V6 inputs are automatically migrated via the .pipe() transformation.
 *
 * Usage:
 * ```ts
 * const result = Recording({ ...frontMatter, transcribedText: body });
 * // result is always V7 shape: { version: 7, transcript: string, ... }
 * ```
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

/**
 * Recording intermediate representation.
 *
 * This type represents the unified interface for recordings across the application.
 * It is NOT the storage format - different storage implementations use different formats:
 *
 * - Desktop: Stores metadata in markdown files (.md) and audio in separate files (.webm, .mp3)
 * - Web: Stores in IndexedDB with serialized audio (see RecordingStoredInIndexedDB)
 *
 * Both implementations read their storage format and convert it to this intermediate
 * representation for use in the UI layer.
 *
 * Audio access: Audio data is NOT stored in this intermediate representation. Instead, use:
 * - `db.recordings.getAudioBlob(id)` to fetch audio as a Blob
 * - `db.recordings.ensureAudioPlaybackUrl(id)` to get a playback URL
 * - `db.recordings.revokeAudioUrl(id)` to clean up cached URLs
 */
export type Recording = RecordingV7;

// ============================================================================
// INDEXEDDB STORAGE TYPES
// ============================================================================

/**
 * Serialized audio format for IndexedDB storage.
 *
 * This format is used to work around iOS Safari's limitations with storing Blob objects
 * in IndexedDB. Instead of storing the Blob directly (which can fail or become corrupted
 * on iOS), we deconstruct it into:
 * - arrayBuffer: The raw binary data
 * - blobType: The original MIME type (e.g., 'audio/webm', 'audio/wav')
 *
 * This can be reliably stored in IndexedDB on all platforms, including iOS Safari.
 * To reconstruct: new Blob([arrayBuffer], { type: blobType })
 *
 * @see /Users/braden/Code/whispering/.conductor/la-paz/docs/patterns/serialized-audio-pattern.md
 */
export type SerializedAudio = {
	arrayBuffer: ArrayBuffer;
	blobType: string;
};

/**
 * How a recording is actually stored in IndexedDB (storage format).
 *
 * This is NOT the intermediate representation used by the UI (see Recording type).
 *
 * Extends Recording with:
 * - `serializedAudio` field for storing audio data (see SerializedAudio type)
 * - Audio is stored in serialized format to work around iOS Safari Blob storage issues
 */
export type RecordingStoredInIndexedDB = Recording & {
	serializedAudio: SerializedAudio | undefined;
};

// ============================================================================
// DEXIE SCHEMA VERSIONS (for IndexedDB migrations)
// ============================================================================
// FROZEN SNAPSHOTS: Each type is a complete, self-contained definition of what
// the data looked like at that Dexie version. Do not derive from current types!
// When Recording changes, these historical types must NOT change.
// ============================================================================

/**
 * Dexie v0.7 (CURRENT): Recording V7 with 'transcript' field and 'version' field.
 * FROZEN: This represents the schema after the V6→V7 migration.
 */
export type RecordingsDbSchemaV6 = {
	recordings: {
		id: string;
		title: string;
		subtitle: string;
		timestamp: string;
		createdAt: string;
		updatedAt: string;
		version: 7;
		transcript: string;
		transcriptionStatus: 'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED';
		serializedAudio: SerializedAudio | undefined;
	};
};

/**
 * Dexie v0.5: Recording with 'transcribedText' field, no 'version' field.
 * FROZEN: This represents the schema BEFORE the V6→V7 migration.
 */
export type RecordingsDbSchemaV5 = {
	recordings: {
		id: string;
		title: string;
		subtitle: string;
		timestamp: string;
		createdAt: string;
		updatedAt: string;
		transcribedText: string;
		transcriptionStatus: 'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED';
		serializedAudio: SerializedAudio | undefined;
	};
};

/**
 * Dexie v0.4: Added createdAt/updatedAt, still uses Blob for audio.
 * FROZEN: Do not modify.
 */
export type RecordingsDbSchemaV4 = {
	recordings: {
		id: string;
		title: string;
		subtitle: string;
		timestamp: string;
		createdAt: string;
		updatedAt: string;
		transcribedText: string;
		transcriptionStatus: 'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED';
		blob: Blob | undefined;
	};
};

/**
 * Dexie v0.3: Merged recordingMetadata + recordingBlobs back into recordings.
 * FROZEN: Do not modify.
 */
export type RecordingsDbSchemaV3 = {
	recordings: {
		id: string;
		title: string;
		subtitle: string;
		timestamp: string;
		transcribedText: string;
		transcriptionStatus: 'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED';
		blob: Blob | undefined;
	};
};

/**
 * Dexie v0.2: Split recordings into recordingMetadata + recordingBlobs.
 * FROZEN: Do not modify.
 */
export type RecordingsDbSchemaV2 = {
	recordingMetadata: {
		id: string;
		title: string;
		subtitle: string;
		timestamp: string;
		transcribedText: string;
		transcriptionStatus: 'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED';
	};
	recordingBlobs: {
		id: string;
		blob: Blob | undefined;
	};
};

/**
 * Dexie v0.1: Original recordings table with Blob storage.
 * FROZEN: Do not modify.
 */
export type RecordingsDbSchemaV1 = {
	recordings: {
		id: string;
		title: string;
		subtitle: string;
		timestamp: string;
		transcribedText: string;
		transcriptionStatus: 'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED';
		blob: Blob | undefined;
	};
};
