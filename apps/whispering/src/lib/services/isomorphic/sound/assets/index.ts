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
 * Prepares an audio element for playback.
 * For built-in sounds, uses bundled audio files.
 * For custom sounds, loads from IndexedDB.
 * Returns null if the sound cannot be resolved (e.g., custom sound not found).
 */
export async function prepareAudioForPlayback(
	soundName: WhisperingSoundNames,
): Promise<HTMLAudioElement | null> {
	// Resolve audio source
	let src: string | null;
	if (BUILTIN_SOUND_SET.has(soundName)) {
		src = DEFAULT_SOUNDS[soundName as BuiltinSoundName];
	} else {
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

		src = URL.createObjectURL(customBlob);
		activeBlobUrls.set(soundName, src);
	}

	// Get or create cached audio element
	let audio = audioCache.get(soundName);
	if (!audio) {
		audio = new Audio(src);
		audio.preload = 'auto';
		audioCache.set(soundName, audio);
	} else if (audio.src !== src) {
		// Update source if it changed
		audio.src = src;
		audio.load();
	}

	audio.currentTime = 0;
	return audio;
}
