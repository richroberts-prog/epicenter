import { Ok, type Result } from 'wellcrafted/result';
import type { BuiltinSoundName, WhisperingSoundNames } from '$lib/constants/sounds';
import { defineMutation } from '$lib/query/client';
import { services } from '$lib/services';
import type { PlaySoundServiceError } from '$lib/services/isomorphic/sound';
import { settings } from '$lib/stores/settings.svelte';

const soundKeys = {
	all: ['sound'] as const,
	playSoundIfEnabled: ['sound', 'playSoundIfEnabled'] as const,
} as const;

export const sound = {
	playSoundIfEnabled: defineMutation({
		mutationKey: soundKeys.playSoundIfEnabled,
		mutationFn: async (
			soundName: WhisperingSoundNames,
		): Promise<Result<void, PlaySoundServiceError>> => {
			// For built-in sounds, check if enabled in settings
			const playOnKey = `sound.playOn.${soundName}` as `sound.playOn.${BuiltinSoundName}`;
			if (playOnKey in settings.value && !settings.value[playOnKey]) {
				return Ok(undefined);
			}

			// Get volume from settings (for built-in sounds) or use default
			const volumeKey = `sound.volume.${soundName}` as `sound.volume.${BuiltinSoundName}`;
			const volume = volumeKey in settings.value ? settings.value[volumeKey] : 0.5;

			return services.sound.playSound(soundName, { volume });
		},
	}),
};
