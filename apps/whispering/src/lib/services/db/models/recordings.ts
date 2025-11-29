import { type } from 'arktype';

/**
 * The current version of the Recording schema.
 * Increment this when adding new fields or making breaking changes.
 *
 * Version history:
 * - V6: Original schema with 'transcribedText' field (implicit, no version field stored)
 * - V7: Renamed 'transcribedText' to 'transcript'
 */
const CURRENT_RECORDING_VERSION = 7 as const;

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
export type Recording = {
	version: 7;
	id: string;
	title: string;
	subtitle: string;
	timestamp: string;
	createdAt: string;
	updatedAt: string;
	transcript: string;
	/**
	 * Recording lifecycle status:
	 * 1. Begins in 'UNPROCESSED' state
	 * 2. Moves to 'TRANSCRIBING' while audio is being transcribed
	 * 3. Marked as 'DONE' when transcription completes
	 * 4. Marked as 'FAILED' if transcription fails
	 */
	transcriptionStatus: 'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED';
};

const RecordingV7Validator = type({
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

// ============================================================================
// MIGRATING VALIDATORS
// ============================================================================
// These accept any version and migrate to the latest (V7).
// Use these when reading data that might be from an older schema version.
// ============================================================================

/**
 * Migrates a Recording from V6 to V7.
 * Renames 'transcribedText' to 'transcript'.
 */
function migrateV6ToV7(recording: RecordingV6): Recording {
	const { transcribedText, version: _version, ...rest } = recording;
	return {
		...rest,
		version: 7,
		transcript: transcribedText,
	};
}

/**
 * Recording validator with automatic migration.
 * Accepts V6 or V7 and always outputs V7.
 *
 * Use this when reading data that might contain old schema versions.
 * Internal use only - not exported to avoid type conflicts.
 */
const RecordingMigrator = RecordingV6.or(RecordingV7Validator).pipe(
	(recording): Recording => {
		if (recording.version === 6) {
			return migrateV6ToV7(recording);
		}
		return recording;
	},
);

/**
 * Validate and migrate a recording from any version to current (V7).
 * Use this when reading data that might be from an older schema version.
 */
export function validateAndMigrateRecording(data: unknown): Recording | null {
	const result = RecordingMigrator(data);
	if (result instanceof type.errors) {
		console.error('Recording validation failed:', result.summary);
		return null;
	}
	return result;
}

/** Current version constant for use when creating new recordings */
export { CURRENT_RECORDING_VERSION };

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
// These types represent the structure of the IndexedDB tables at each Dexie version.
// They are separate from the Recording schema versions above.
// ============================================================================

export type RecordingsDbSchemaV6 = {
	recordings: RecordingStoredInIndexedDB;
};

export type RecordingsDbSchemaV5 = {
	recordings: Omit<RecordingStoredInIndexedDB, 'transcript' | 'version'> & {
		transcribedText: string;
	};
};

export type RecordingsDbSchemaV4 = {
	recordings: RecordingsDbSchemaV3['recordings'] & {
		// V4 added 'createdAt' and 'updatedAt' fields
		createdAt: string;
		updatedAt: string;
	};
};

export type RecordingsDbSchemaV3 = {
	recordings: RecordingsDbSchemaV1['recordings'];
};

export type RecordingsDbSchemaV2 = {
	recordingMetadata: Omit<RecordingsDbSchemaV1['recordings'], 'blob'>;
	recordingBlobs: { id: string; blob: Blob | undefined };
};

export type RecordingsDbSchemaV1 = {
	recordings: {
		id: string;
		title: string;
		subtitle: string;
		timestamp: string;
		transcribedText: string;
		blob: Blob | undefined;
		/**
		 * A recording
		 * 1. Begins in an 'UNPROCESSED' state
		 * 2. Moves to 'TRANSCRIBING' while the audio is being transcribed
		 * 3. Finally is marked as 'DONE' when the transcription is complete.
		 * 4. If the transcription fails, it is marked as 'FAILED'
		 */
		transcriptionStatus: 'UNPROCESSED' | 'TRANSCRIBING' | 'DONE' | 'FAILED';
	};
};
