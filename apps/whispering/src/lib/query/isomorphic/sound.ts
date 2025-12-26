import { Ok, type Result } from 'wellcrafted/result';
import {
	BUILTIN_SOUND_NAMES,
	type BuiltinSoundName,
	type WhisperingSoundNames,
} from '$lib/constants/sounds';
import { defineMutation } from '$lib/query/client';
import { services } from '$lib/services';
import type { PlaySoundServiceError } from '$lib/services/isomorphic/sound';
import { settings } from '$lib/stores/settings.svelte';

const soundKeys = {
	all: ['sound'] as const,
	playSoundIfEnabled: ['sound', 'playSoundIfEnabled'] as const,
} as const;

const BUILTIN_SOUND_SET = new Set<string>(BUILTIN_SOUND_NAMES);

function isBuiltinSound(soundName: string): soundName is BuiltinSoundName {
	return BUILTIN_SOUND_SET.has(soundName);
}

export const sound = {
	playSoundIfEnabled: defineMutation({
		mutationKey: soundKeys.playSoundIfEnabled,
		mutationFn: async (
			soundName: WhisperingSoundNames,
		): Promise<Result<void, PlaySoundServiceError>> => {
			// For built-in sounds, check settings; for custom sounds, always play
			if (isBuiltinSound(soundName)) {
				if (!settings.value[`sound.playOn.${soundName}`]) {
					return Ok(undefined);
				}
				const volume = settings.value[`sound.volume.${soundName}`];
				return services.sound.playSound(soundName, { volume });
			}

			// Custom sounds use default volume
			return services.sound.playSound(soundName, { volume: 0.5 });
		},
	}),
};
