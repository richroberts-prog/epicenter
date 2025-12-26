import type { WhisperingSoundNames } from '$lib/constants/sounds';
import buttonBlipSrc from './sound_ex_machina_Button_Blip.mp3';
import alarmButtonPressSrc from './zapsplat_household_alarm_clock_button_press_12967.mp3';
import snoozeButtonPress1Src from './zapsplat_household_alarm_clock_large_snooze_button_press_001_12968.mp3';
import snoozeButtonPress2Src from './zapsplat_household_alarm_clock_large_snooze_button_press_002_12969.mp3';
import shortClickSrc from './zapsplat_multimedia_click_button_short_sharp_73510.mp3';
import alertChimeSrc from './zapsplat_multimedia_notification_alert_ping_bright_chime_001_93276.mp3';
import bellSynthSrc from './zapsplat_multimedia_ui_notification_classic_bell_synth_success_107505.mp3';

/** Default bundled sound sources for each sound event */
export const DEFAULT_SOUNDS = {
	'manual-start': alarmButtonPressSrc,
	'manual-cancel': shortClickSrc,
	'manual-stop': buttonBlipSrc,
	'cpal-start': alarmButtonPressSrc,
	'cpal-cancel': shortClickSrc,
	'cpal-stop': buttonBlipSrc,
	'vad-start': snoozeButtonPress2Src,
	'vad-capture': buttonBlipSrc,
	'vad-stop': snoozeButtonPress1Src,
	transcriptionComplete: bellSynthSrc,
	transformationComplete: alertChimeSrc,
} as const satisfies Record<WhisperingSoundNames, string>;

/** Cached audio elements for lazy initialization */
const audioCache = new Map<WhisperingSoundNames, HTMLAudioElement>();

/** Active blob URLs that need cleanup */
const activeBlobUrls = new Map<WhisperingSoundNames, string>();

/**
 * Gets or creates a cached audio element for a sound.
 * Uses lazy initialization - audio elements are only created when first needed.
 */
export function getOrCreateAudioElement(
	soundName: WhisperingSoundNames,
): HTMLAudioElement {
	const cached = audioCache.get(soundName);
	if (cached) return cached;

	const audio = new Audio(DEFAULT_SOUNDS[soundName]);
	audio.preload = 'auto';
	audioCache.set(soundName, audio);
	return audio;
}

/**
 * Resolves the audio source for a sound, checking for custom sounds first.
 * If hasCustomSound is true, attempts to load from IndexedDB.
 * Otherwise, returns the default bundled sound.
 */
export async function resolveAudioSource(
	soundName: WhisperingSoundNames,
	hasCustomSound: boolean,
): Promise<string> {
	if (!hasCustomSound) {
		return DEFAULT_SOUNDS[soundName];
	}

	// Import here to avoid circular dependencies
	const { services } = await import('$lib/services');
	const { data: customBlob, error } = await services.db.sounds.get(soundName);

	if (error || !customBlob) {
		if (error) {
			console.warn(`Failed to load custom sound for ${soundName}:`, error);
		}
		return DEFAULT_SOUNDS[soundName];
	}

	// Clean up previous blob URL for this sound if it exists
	const previousUrl = activeBlobUrls.get(soundName);
	if (previousUrl) {
		URL.revokeObjectURL(previousUrl);
	}

	const newUrl = URL.createObjectURL(customBlob);
	activeBlobUrls.set(soundName, newUrl);

	return newUrl;
}

/**
 * Updates the audio element source if needed and prepares it for playback.
 * Handles both custom sounds (from IndexedDB) and default bundled sounds.
 */
export async function prepareAudioForPlayback(
	soundName: WhisperingSoundNames,
	hasCustomSound: boolean,
): Promise<HTMLAudioElement> {
	const audio = getOrCreateAudioElement(soundName);
	const newSrc = await resolveAudioSource(soundName, hasCustomSound);

	// Only reload if the source has changed
	if (audio.src !== newSrc) {
		audio.src = newSrc;
		audio.load();
	}

	// Reset to beginning for replay
	audio.currentTime = 0;

	return audio;
}
