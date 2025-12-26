import {
	BUILTIN_SOUND_NAMES,
	type BuiltinSoundName,
	type WhisperingSoundNames,
} from '$lib/constants/sounds';
import { DbServiceLive } from '../../db';
import buttonBlipSrc from './sound_ex_machina_Button_Blip.mp3';
import alarmButtonPressSrc from './zapsplat_household_alarm_clock_button_press_12967.mp3';
import snoozeButtonPress1Src from './zapsplat_household_alarm_clock_large_snooze_button_press_001_12968.mp3';
import snoozeButtonPress2Src from './zapsplat_household_alarm_clock_large_snooze_button_press_002_12969.mp3';
import shortClickSrc from './zapsplat_multimedia_click_button_short_sharp_73510.mp3';
import alertChimeSrc from './zapsplat_multimedia_notification_alert_ping_bright_chime_001_93276.mp3';
import bellSynthSrc from './zapsplat_multimedia_ui_notification_classic_bell_synth_success_107505.mp3';

/** Default bundled sound sources for built-in sound events */
const DEFAULT_SOUNDS: Record<BuiltinSoundName, string> = {
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
};

/** Set of built-in sound names for quick lookup */
const BUILTIN_SOUND_SET = new Set<string>(BUILTIN_SOUND_NAMES);

/** Cached audio elements for lazy initialization */
const audioCache = new Map<WhisperingSoundNames, HTMLAudioElement>();

/** Active blob URLs that need cleanup */
const activeBlobUrls = new Map<WhisperingSoundNames, string>();

/**
 * Checks if a sound name is a built-in sound with a default audio file.
 */
function isBuiltinSound(soundName: string): soundName is BuiltinSoundName {
	return BUILTIN_SOUND_SET.has(soundName);
}

/**
 * Gets or creates a cached audio element for a sound.
 * Uses lazy initialization - audio elements are only created when first needed.
 */
function getOrCreateAudioElement(
	soundName: WhisperingSoundNames,
	initialSrc?: string,
): HTMLAudioElement {
	const cached = audioCache.get(soundName);
	if (cached) return cached;

	const src =
		initialSrc ?? (isBuiltinSound(soundName) ? DEFAULT_SOUNDS[soundName] : '');
	const audio = new Audio(src);
	audio.preload = 'auto';
	audioCache.set(soundName, audio);
	return audio;
}

/**
 * Resolves the audio source for a sound.
 * For built-in sounds, returns the default bundled file.
 * For custom sounds, loads from IndexedDB.
 */
async function resolveAudioSource(
	soundName: WhisperingSoundNames,
): Promise<string | null> {
	// Built-in sounds use default bundled files
	if (isBuiltinSound(soundName)) {
		return DEFAULT_SOUNDS[soundName];
	}

	// Custom sounds are loaded from IndexedDB
	const { data: customBlob, error } = await DbServiceLive.sounds.get(soundName);

	if (error || !customBlob) {
		if (error) {
			console.warn(`Failed to load custom sound for ${soundName}:`, error);
		}
		return null;
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
 * Prepares an audio element for playback.
 * For built-in sounds, uses bundled audio files.
 * For custom sounds, loads from IndexedDB.
 * Returns null if the sound cannot be resolved (e.g., custom sound not found).
 */
export async function prepareAudioForPlayback(
	soundName: WhisperingSoundNames,
): Promise<HTMLAudioElement | null> {
	const newSrc = await resolveAudioSource(soundName);

	if (!newSrc) {
		return null;
	}

	const audio = getOrCreateAudioElement(soundName, newSrc);

	// Only reload if the source has changed
	if (audio.src !== newSrc) {
		audio.src = newSrc;
		audio.load();
	}

	// Reset to beginning for replay
	audio.currentTime = 0;

	return audio;
}
