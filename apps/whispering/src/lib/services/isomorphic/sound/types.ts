import { createTaggedError } from 'wellcrafted/error';
import type { Result } from 'wellcrafted/result';
import type { WhisperingSoundNames } from '$lib/constants/sounds';

export const { PlaySoundServiceError, PlaySoundServiceErr } = createTaggedError(
	'PlaySoundServiceError',
);
export type PlaySoundServiceError = ReturnType<typeof PlaySoundServiceError>;

export type PlaySoundOptions = {
	/** Volume level from 0.0 to 1.0 */
	volume: number;
	/** Whether this sound uses a custom audio file from IndexedDB */
	hasCustomSound: boolean;
};

export type PlaySoundService = {
	playSound: (
		soundName: WhisperingSoundNames,
		options: PlaySoundOptions,
	) => Promise<Result<void, PlaySoundServiceError>>;
};
