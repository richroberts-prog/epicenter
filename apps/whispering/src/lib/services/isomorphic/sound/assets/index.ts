import type { WhisperingSoundNames } from '$lib/constants/sounds';
import buttonBlipSrc from './sound_ex_machina_Button_Blip.mp3';
import alarmButtonPressSrc from './zapsplat_household_alarm_clock_button_press_12967.mp3';
import snoozeButtonPress1Src from './zapsplat_household_alarm_clock_large_snooze_button_press_001_12968.mp3';
import snoozeButtonPress2Src from './zapsplat_household_alarm_clock_large_snooze_button_press_002_12969.mp3';
import shortClickSrc from './zapsplat_multimedia_click_button_short_sharp_73510.mp3';
import alertChimeSrc from './zapsplat_multimedia_notification_alert_ping_bright_chime_001_93276.mp3';
import bellSynthSrc from './zapsplat_multimedia_ui_notification_classic_bell_synth_success_107505.mp3';

/** Default bundled sound sources for each sound event */
const DEFAULT_SOUNDS = {
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

const createAudioElement = (src: string): HTMLAudioElement => {
	const audio = new Audio(src);
	audio.volume = 0.5;
	return audio;
};

/** Pre-initialized audio elements for each sound event */
export const audioElements = Object.fromEntries(
	Object.entries(DEFAULT_SOUNDS).map(([name, src]) => [
		name,
		createAudioElement(src),
	]),
) as Record<WhisperingSoundNames, HTMLAudioElement>;

/**
 * Resolves the audio source URL for a sound, checking for custom sounds first.
 * Returns a custom sound URL if one exists in the db, otherwise falls back to default.
 */
const resolveAudioSource = async (
	soundName: WhisperingSoundNames,
): Promise<string> => {
	// Import here to avoid circular dependencies
	const { settings } = await import('$lib/stores/settings.svelte');
	const { services } = await import('$lib/services');

	const hasCustomSound = settings.value[`sound.custom.${soundName}`];

	if (hasCustomSound) {
		const { data: customBlob, error } = await services.db.sounds.get(soundName);

		if (!error && customBlob) {
			const tempUrl = URL.createObjectURL(customBlob);
			setTimeout(() => URL.revokeObjectURL(tempUrl), 10000);
			return tempUrl;
		}

		if (error) {
			console.warn(`Failed to load custom sound for ${soundName}:`, error);
		}
	}

	return DEFAULT_SOUNDS[soundName];
};

// Function to update audio element source (async)
export const updateAudioSource = async (soundName: WhisperingSoundNames) => {
	const audioElement = audioElements[soundName];
	const newSrc = await resolveAudioSource(soundName);

	if (audioElement.src !== newSrc) {
		audioElement.src = newSrc;
		// Preload the new sound
		audioElement.load();
	}
};
