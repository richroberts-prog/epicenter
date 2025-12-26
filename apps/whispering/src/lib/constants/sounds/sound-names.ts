/**
 * Sound event names used throughout the application.
 * Users can override the audio file for any sound via custom uploads.
 */
export const SOUND_NAMES = [
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

export type SoundName = (typeof SOUND_NAMES)[number];
