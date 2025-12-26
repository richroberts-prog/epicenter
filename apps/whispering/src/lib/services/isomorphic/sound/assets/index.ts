import type { SoundName } from '$lib/constants/sounds';
import { DbServiceLive } from '../../db';
import buttonBlipSrc from './sound_ex_machina_Button_Blip.mp3';
import alarmButtonPressSrc from './zapsplat_household_alarm_clock_button_press_12967.mp3';
import snoozeButtonPress1Src from './zapsplat_household_alarm_clock_large_snooze_button_press_001_12968.mp3';
import snoozeButtonPress2Src from './zapsplat_household_alarm_clock_large_snooze_button_press_002_12969.mp3';
import shortClickSrc from './zapsplat_multimedia_click_button_short_sharp_73510.mp3';
import alertChimeSrc from './zapsplat_multimedia_notification_alert_ping_bright_chime_001_93276.mp3';
import bellSynthSrc from './zapsplat_multimedia_ui_notification_classic_bell_synth_success_107505.mp3';

/** Default bundled sound sources for each sound event */
const DEFAULT_SOUNDS: Record<SoundName, string> = {
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

/** Cached audio elements for lazy initialization */
const audioCache = new Map<SoundName, HTMLAudioElement>();

/** Active blob URLs that need cleanup */
const activeBlobUrls = new Map<SoundName, string>();

/**
 * Prepares an audio element for playback.
 * First tries to load custom sound from IndexedDB, then falls back to default.
 */
export async function prepareAudioForPlayback(
	soundName: SoundName,
): Promise<HTMLAudioElement> {
	// Try to load custom sound first
	const { data: customBlob } = await DbServiceLive.sounds.get(soundName);

	let src: string;
	if (customBlob) {
		// Clean up previous blob URL for this sound if it exists
		const previousUrl = activeBlobUrls.get(soundName);
		if (previousUrl) {
			URL.revokeObjectURL(previousUrl);
		}
		src = URL.createObjectURL(customBlob);
		activeBlobUrls.set(soundName, src);
	} else {
		// Fall back to default bundled sound
		src = DEFAULT_SOUNDS[soundName];
	}

	// Get or create cached audio element
	let audio = audioCache.get(soundName);
	if (!audio) {
		audio = new Audio(src);
		audio.preload = 'auto';
		audioCache.set(soundName, audio);
	} else if (audio.src !== src) {
		// Update source if it changed (e.g., custom sound added/removed)
		audio.src = src;
		audio.load();
	}

	audio.currentTime = 0;
	return audio;
}
