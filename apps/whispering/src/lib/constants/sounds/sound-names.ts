/**
 * Built-in sound effect names with known defaults.
 * Custom sounds can use any string identifier.
 */
export const BUILTIN_SOUND_NAMES = [
	'manual-start',
	'manual-stop',
	'manual-cancel',
	'cpal-start',
	'cpal-stop',
	'cpal-cancel',
	'vad-start',
	'vad-capture',
	'vad-stop',
	'transcriptionComplete',
	'transformationComplete',
] as const;

export type BuiltinSoundName = (typeof BUILTIN_SOUND_NAMES)[number];

/**
 * Sound names used throughout the application.
 * Includes built-in sounds with autocomplete, plus arbitrary custom sound IDs.
 */
export type WhisperingSoundNames = BuiltinSoundName | (string & {});
