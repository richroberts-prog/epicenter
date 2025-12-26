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

type CachedAudio = {
	element: HTMLAudioElement;
	/** Blob URL that needs cleanup when source changes (only for custom sounds) */
	blobUrl: string | null;
};

/** Cached audio elements with blob URL tracking */
const cache = new Map<SoundName, CachedAudio>();

/**
 * Gets a ready-to-play audio element for a sound.
 * Custom sounds from IndexedDB take priority over bundled defaults.
 */
export async function getAudio(soundName: SoundName): Promise<HTMLAudioElement> {
	// Check for custom sound first, fall back to default
	const { data: customBlob } = await DbServiceLive.sounds.get(soundName);
	const url = customBlob
		? URL.createObjectURL(customBlob)
		: DEFAULT_SOUNDS[soundName];

	const cached = cache.get(soundName);

	if (!cached) {
		// First time playing this sound - create and cache
		const element = new Audio(url);
		element.preload = 'auto';
		cache.set(soundName, { element, blobUrl: customBlob ? url : null });
		return element;
	}

	// Sound source changed (custom sound added/removed)
	if (cached.element.src !== url) {
		// Clean up old blob URL if it exists
		if (cached.blobUrl) {
			URL.revokeObjectURL(cached.blobUrl);
		}

		cached.element.src = url;
		cached.element.load();
		cached.blobUrl = customBlob ? url : null;
	}

	cached.element.currentTime = 0;
	return cached.element;
}
