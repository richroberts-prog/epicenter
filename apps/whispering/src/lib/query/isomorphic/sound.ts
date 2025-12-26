import { Ok, type Result } from 'wellcrafted/result';
import type { WhisperingSoundNames } from '$lib/constants/sounds';
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
			// Check if this sound is enabled
			const isEnabled = settings.value[`sound.playOn.${soundName}`];
			if (!isEnabled) {
				return Ok(undefined);
			}

			// Read volume and custom sound settings
			const volume = settings.value[`sound.volume.${soundName}`];
			const hasCustomSound = settings.value[`sound.custom.${soundName}`];

			return services.sound.playSound(soundName, { volume, hasCustomSound });
		},
	}),
};
