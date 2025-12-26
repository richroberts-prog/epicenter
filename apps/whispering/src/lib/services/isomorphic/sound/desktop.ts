import { extractErrorMessage } from 'wellcrafted/error';
import { tryAsync } from 'wellcrafted/result';
import type { PlaySoundService } from '.';
import { prepareAudioForPlayback } from './assets';
import { PlaySoundServiceErr } from './types';

export function createPlaySoundServiceDesktop(): PlaySoundService {
	return {
		playSound: async (soundName, { volume }) =>
			tryAsync({
				try: async () => {
					const audio = await prepareAudioForPlayback(soundName);
					audio.volume = volume;
					await audio.play();
				},
				catch: (error) =>
					PlaySoundServiceErr({
						message: `Failed to play sound: ${extractErrorMessage(error)}`,
					}),
			}),
	};
}
