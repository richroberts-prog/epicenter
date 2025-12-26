import type { WhisperingSoundNames } from '$lib/constants/sounds';

export interface CustomSound {
	id: WhisperingSoundNames;
	serializedAudio: { arrayBuffer: ArrayBuffer; blobType: string };
	fileName: string;
	fileSize: number;
	uploadedAt: string;
	updatedAt: string;
}
