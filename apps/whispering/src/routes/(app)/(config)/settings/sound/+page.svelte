<script lang="ts">
	import * as Field from '@repo/ui/field';
	import { Separator } from '@repo/ui/separator';
	import { Button } from '@repo/ui/button';
	import { Switch } from '@repo/ui/switch';
	import { Slider } from '@repo/ui/slider';
	import PlayIcon from '@lucide/svelte/icons/play';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import XIcon from '@lucide/svelte/icons/x';
	import { settings } from '$lib/stores/settings.svelte';
	import { type WhisperingSoundNames } from '$lib/constants/sounds';
	import { rpc } from '$lib/query';
	import { FileDropZone, ACCEPT_AUDIO, MEGABYTE } from '@repo/ui/file-drop-zone';

	// Sound events configuration
	const soundEvents = [
		{ key: 'manual-start', label: 'Manual Recording Start', description: 'When you start recording manually' },
		{ key: 'manual-stop', label: 'Manual Recording Stop', description: 'When you stop recording manually' },
		{ key: 'manual-cancel', label: 'Manual Recording Cancel', description: 'When you cancel recording manually' },
		{ key: 'cpal-start', label: 'CPAL Recording Start', description: 'When CPAL recording starts' },
		{ key: 'cpal-stop', label: 'CPAL Recording Stop', description: 'When CPAL recording stops' },
		{ key: 'cpal-cancel', label: 'CPAL Recording Cancel', description: 'When CPAL recording is cancelled' },
		{ key: 'vad-start', label: 'VAD Session Start', description: 'When voice activity detection session begins' },
		{ key: 'vad-capture', label: 'VAD Capture', description: 'When voice activity is detected and captured' },
		{ key: 'vad-stop', label: 'VAD Session Stop', description: 'When voice activity detection session ends' },
		{ key: 'transcriptionComplete', label: 'Transcription Complete', description: 'When audio transcription finishes' },
		{ key: 'transformationComplete', label: 'Transformation Complete', description: 'When text transformation finishes' },
	] as const;

	const testSound = (soundKey: string) => {
		rpc.sound.playSoundIfEnabled.execute(soundKey as WhisperingSoundNames);
	};

	const applyGlobalVolume = (volume: number) => {
		const volumeDecimal = volume / 100;
		soundEvents.forEach(event => {
			settings.updateKey(`sound.volume.${event.key}` as keyof typeof settings.value, volumeDecimal as never);
		});
	};

	const handleCustomSoundUpload = async (files: File[], soundKey: string) => {
		const file = files[0];
		if (!file) return;

		if (!file.type.startsWith('audio/')) {
			rpc.notify.error.execute({
				title: 'Invalid file type',
				description: 'Please upload an audio file (MP3, WAV, OGG, etc.)',
			});
			return;
		}

		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			rpc.notify.error.execute({
				title: 'File too large',
				description: 'File size must be less than 5MB',
			});
			return;
		}

		try {
			const now = new Date().toISOString();
			const metadata = {
				fileName: file.name,
				fileSize: file.size,
				blobType: file.type,
				uploadedAt: now,
			};

			const { db } = await import('$lib/services');
			const { error } = await db.sounds.save(soundKey as WhisperingSoundNames, file, metadata);
			if (error) throw error;

			settings.updateKey(`sound.custom.${soundKey}` as keyof typeof settings.value, true as never);

			rpc.notify.success.execute({
				title: 'Custom sound uploaded',
				description: `Custom sound for ${soundEvents.find(e => e.key === soundKey)?.label} has been saved.`,
			});
		} catch (error) {
			rpc.notify.error.execute({
				title: 'Upload failed',
				description: 'Failed to save custom sound. Please try again.',
				action: { type: 'more-details', error },
			});
		}
	};

	const removeCustomSound = async (soundKey: string) => {
		try {
			const { db } = await import('$lib/services');
			const { error } = await db.sounds.delete(soundKey as WhisperingSoundNames);
			if (error) throw error;

			settings.updateKey(`sound.custom.${soundKey}` as keyof typeof settings.value, false as never);

			rpc.notify.success.execute({
				title: 'Custom sound removed',
				description: `Reverted to default sound for ${soundEvents.find(e => e.key === soundKey)?.label}.`,
			});
		} catch (error) {
			rpc.notify.error.execute({
				title: 'Failed to remove custom sound',
				description: 'Please try again.',
				action: { type: 'more-details', error },
			});
		}
	};
</script>

<svelte:head>
	<title>Sound Settings - Whispering</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-medium">Sound Settings</h3>
		<p class="text-muted-foreground text-sm">
			Configure notification sounds, volumes, and custom sounds.
		</p>
	</div>

	<Separator />

	<!-- Global Volume Control -->
	<Field.Set>
		<Field.Legend>Global Controls</Field.Legend>
		<Field.Description>Quickly set the same volume for all notification sounds</Field.Description>
		<Field.Group>
			<Field.Field>
				<Field.Label>Set All Volumes</Field.Label>
				<div class="flex items-center gap-4">
					<Slider
						type="single"
						value={[Math.round(settings.value['sound.volume'] * 100)]}
						onValueChange={(v) => {
							const volume = v[0];
							settings.updateKey('sound.volume', volume / 100);
							applyGlobalVolume(volume);
						}}
						max={100}
						min={0}
						step={5}
						class="flex-1"
					/>
					<span class="text-sm font-medium w-12 text-right tabular-nums">
						{Math.round(settings.value['sound.volume'] * 100)}%
					</span>
					<Button variant="outline" size="sm" onclick={() => testSound('transcriptionComplete')}>
						<PlayIcon class="mr-2 size-4" />
						Test
					</Button>
				</div>
			</Field.Field>
		</Field.Group>
	</Field.Set>

	<Separator />

	<!-- Individual Sound Controls -->
	<Field.Set>
		<Field.Legend>Individual Sound Controls</Field.Legend>
		<Field.Description>Configure each notification sound individually</Field.Description>
		<Field.Group>
			{#each soundEvents as event}
				<div class="border rounded-lg p-4 space-y-4">
					<Field.Field orientation="horizontal">
						<Field.Content>
							<Field.Title>{event.label}</Field.Title>
							<Field.Description>{event.description}</Field.Description>
						</Field.Content>
						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onclick={() => testSound(event.key)}
								disabled={!settings.value[`sound.playOn.${event.key}` as keyof typeof settings.value]}
							>
								<PlayIcon class="mr-2 size-4" />
								Test
							</Button>
							<Switch
								id="sound.playOn.{event.key}"
								bind:checked={
									() => settings.value[`sound.playOn.${event.key}` as keyof typeof settings.value] as boolean,
									(v) => settings.updateKey(`sound.playOn.${event.key}` as keyof typeof settings.value, v as never)
								}
							/>
						</div>
					</Field.Field>

					<Field.Field>
						<Field.Label>Volume</Field.Label>
						<div class="flex items-center gap-4">
							<Slider
								type="single"
								value={[Math.round((settings.value[`sound.volume.${event.key}` as keyof typeof settings.value] as number) * 100)]}
								onValueChange={(v) => {
									settings.updateKey(`sound.volume.${event.key}` as keyof typeof settings.value, (v[0] / 100) as never);
								}}
								max={100}
								min={0}
								step={5}
								class="flex-1"
							/>
							<span class="text-sm font-medium w-12 text-right tabular-nums">
								{Math.round((settings.value[`sound.volume.${event.key}` as keyof typeof settings.value] as number) * 100)}%
							</span>
						</div>
					</Field.Field>

					<Field.Field>
						<Field.Label>Custom Sound</Field.Label>
						{#if settings.value[`sound.custom.${event.key}` as keyof typeof settings.value]}
							<div class="flex items-center gap-2 p-2 bg-muted rounded">
								<span class="text-sm flex-1">Custom sound uploaded</span>
								<Button
									variant="outline"
									size="sm"
									onclick={() => removeCustomSound(event.key)}
								>
									<XIcon class="mr-1 size-3" />
									Remove
								</Button>
							</div>
						{:else}
							<FileDropZone
								accept={ACCEPT_AUDIO}
								maxFiles={1}
								maxFileSize={5 * MEGABYTE}
								onUpload={(files) => handleCustomSoundUpload(files, event.key)}
								class="h-20"
							>
								<div class="flex flex-col items-center gap-1">
									<UploadIcon class="size-4 text-muted-foreground" />
									<span class="text-xs text-muted-foreground">
										Drop audio file or click to browse
									</span>
								</div>
							</FileDropZone>
						{/if}
					</Field.Field>
				</div>
			{/each}
		</Field.Group>
	</Field.Set>
</div>
