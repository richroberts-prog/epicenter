<script lang="ts">
	import * as Field from '@epicenter/ui/field';
	import * as Item from '@epicenter/ui/item';
	import { Badge } from '@epicenter/ui/badge';
	import { Button } from '@epicenter/ui/button';
	import { Switch } from '@epicenter/ui/switch';
	import { Slider } from '@epicenter/ui/slider';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import PlayIcon from '@lucide/svelte/icons/play';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import XIcon from '@lucide/svelte/icons/x';
	import { settings } from '$lib/stores/settings.svelte';
	import { type SoundName } from '$lib/constants/sounds';
	import { rpc } from '$lib/query';
	import { services } from '$lib/services';
	import {
		FileDropZone,
		ACCEPT_AUDIO,
		MEGABYTE,
	} from '@epicenter/ui/file-drop-zone';
	import OpenFolderButton from '$lib/components/OpenFolderButton.svelte';
	import { PATHS } from '$lib/constants/paths';
	import { Ok, tryAsync } from 'wellcrafted/result';

	async function revealCustomSound(soundKey: string) {
		if (!window.__TAURI_INTERNALS__) return;

		await tryAsync({
			try: async () => {
				const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
				const soundsPath = await PATHS.DB.CUSTOM_SOUNDS();
				const { readDir } = await import('@tauri-apps/plugin-fs');
				const { join } = await import('@tauri-apps/api/path');

				const files = await readDir(soundsPath);
				const audioFile = files.find(
					(f) => f.name.startsWith(`${soundKey}.`) && !f.name.endsWith('.md'),
				);

				if (audioFile) {
					const filePath = await join(soundsPath, audioFile.name);
					await revealItemInDir(filePath);
				} else {
					// If no file found, just open the folder
					const { openPath } = await import('@tauri-apps/plugin-opener');
					await openPath(soundsPath);
				}
			},
			catch: (error) => {
				rpc.notify.error.execute({
					title: 'Failed to reveal file',
					description: error instanceof Error ? error.message : 'Unknown error',
				});
				return Ok(undefined);
			},
		});
	}

	const SOUND_EVENTS = [
		{
			key: 'manual-start',
			label: 'Manual Recording Start',
			description: 'When you start recording manually',
		},
		{
			key: 'manual-stop',
			label: 'Manual Recording Stop',
			description: 'When you stop recording manually',
		},
		{
			key: 'manual-cancel',
			label: 'Manual Recording Cancel',
			description: 'When you cancel recording manually',
		},
		{
			key: 'cpal-start',
			label: 'CPAL Recording Start',
			description: 'When CPAL recording starts',
		},
		{
			key: 'cpal-stop',
			label: 'CPAL Recording Stop',
			description: 'When CPAL recording stops',
		},
		{
			key: 'cpal-cancel',
			label: 'CPAL Recording Cancel',
			description: 'When CPAL recording is cancelled',
		},
		{
			key: 'vad-start',
			label: 'VAD Session Start',
			description: 'When voice activity detection session begins',
		},
		{
			key: 'vad-capture',
			label: 'VAD Capture',
			description: 'When voice activity is detected and captured',
		},
		{
			key: 'vad-stop',
			label: 'VAD Session Stop',
			description: 'When voice activity detection session ends',
		},
		{
			key: 'transcription-complete',
			label: 'Transcription Complete',
			description: 'When audio transcription finishes',
		},
		{
			key: 'transformation-complete',
			label: 'Transformation Complete',
			description: 'When text transformation finishes',
		},
	] as const satisfies {
		key: SoundName;
		label: string;
		description: string;
	}[];
</script>

<svelte:head>
	<title>Sound Settings - Whispering</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-start justify-between">
		<div>
			<h3 class="text-lg font-medium">Sound Settings</h3>
			<p class="text-muted-foreground text-sm">
				Configure notification sounds, volumes, and custom sounds.
			</p>
		</div>
		<OpenFolderButton
			getFolderPath={PATHS.DB.CUSTOM_SOUNDS}
			tooltipText="Open custom sounds folder"
		/>
	</div>

	<!-- Global Volume Control -->
	<Field.Set>
		<Field.Legend>Global Controls</Field.Legend>
		<Field.Description
			>Quickly set the same volume for all notification sounds</Field.Description
		>
		<Field.Group>
			<Field.Field>
				<Field.Label>Set All Volumes</Field.Label>
				<Field.Description>
					Current volume: <span class="font-medium tabular-nums"
						>{Math.round(settings.value['sound.volume'] * 100)}%</span
					>
				</Field.Description>
				<div class="flex items-center gap-4">
					<Slider
						type="single"
						bind:value={
							() => Math.round(settings.value['sound.volume'] * 100),
							(v) => {
								const volumeDecimal = v / 100;
								settings.update({
									'sound.volume': volumeDecimal,
									...Object.fromEntries(
										SOUND_EVENTS.map(({ key }) => [
											`sound.volume.${key}`,
											volumeDecimal,
										]),
									),
								});
							}
						}
						max={100}
						min={0}
						step={5}
						class="flex-1"
						aria-label="Global volume"
					/>
					<Button
						variant="outline"
						size="sm"
						onclick={() =>
							rpc.sound.playSoundIfEnabled.execute('transcription-complete')}
					>
						<PlayIcon class="mr-2 size-4" />
						Test
					</Button>
				</div>
			</Field.Field>
		</Field.Group>
	</Field.Set>

	<!-- Individual Sound Controls -->
	<Field.Set>
		<Field.Legend>Individual Sound Controls</Field.Legend>
		<Field.Description
			>Configure each notification sound individually</Field.Description
		>
		<Field.Group>
			{#each SOUND_EVENTS as soundEvent}
				<div class="border rounded-lg p-4 space-y-4">
					<Field.Field orientation="horizontal">
						<Field.Content>
							<Field.Title>{soundEvent.label}</Field.Title>
							<Field.Description>{soundEvent.description}</Field.Description>
						</Field.Content>
						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onclick={() =>
									rpc.sound.playSoundIfEnabled.execute(soundEvent.key)}
								disabled={!settings.value[`sound.playOn.${soundEvent.key}`]}
							>
								<PlayIcon class="mr-2 size-4" />
								Test
							</Button>
							<Switch
								id={`sound.playOn.${soundEvent.key}`}
								bind:checked={
									() => settings.value[`sound.playOn.${soundEvent.key}`],
									(v) => settings.updateKey(`sound.playOn.${soundEvent.key}`, v)
								}
							/>
						</div>
					</Field.Field>

					<Field.Field>
						<Field.Label>Volume</Field.Label>
						<Field.Description>
							<span class="font-medium tabular-nums"
								>{Math.round(
									settings.value[`sound.volume.${soundEvent.key}`] * 100,
								)}%</span
							>
						</Field.Description>
						<Slider
							type="single"
							bind:value={
								() =>
									Math.round(
										settings.value[`sound.volume.${soundEvent.key}`] * 100,
									),
								(v) =>
									settings.updateKey(`sound.volume.${soundEvent.key}`, v / 100)
							}
							max={100}
							min={0}
							step={5}
							class="w-full"
							aria-label="{soundEvent.label} volume"
						/>
					</Field.Field>

					<Field.Field>
						<Field.Label>Custom Sound</Field.Label>
						{#if settings.value[`sound.custom.${soundEvent.key}`]}
							<Item.Root variant="muted" size="sm">
								<Item.Media variant="icon">
									<CheckCircle2Icon />
								</Item.Media>
								<Item.Content>
									<Item.Title>Custom sound active</Item.Title>
									<Item.Description>
										{#if window.__TAURI_INTERNALS__}
											<button
												type="button"
												onclick={() => revealCustomSound(soundEvent.key)}
												class="cursor-pointer"
											>
												<Badge variant="id">{soundEvent.key}</Badge>
											</button>
										{:else}
											<Badge variant="id">{soundEvent.key}</Badge>
										{/if}
									</Item.Description>
								</Item.Content>
								<Item.Actions>
									<Button
										variant="outline"
										size="sm"
										onclick={async () => {
											const { error } = await services.db.sounds.delete(
												soundEvent.key,
											);
											if (error) {
												rpc.notify.error.execute({
													title: 'Failed to remove custom sound',
													description: 'Please try again.',
													action: { type: 'more-details', error },
												});
												return;
											}
											settings.updateKey(
												`sound.custom.${soundEvent.key}`,
												false,
											);
											rpc.notify.success.execute({
												title: 'Custom sound removed',
												description: `Reverted to default sound for ${soundEvent.label}.`,
											});
										}}
									>
										<XIcon class="mr-1 size-3" />
										Remove
									</Button>
								</Item.Actions>
							</Item.Root>
						{:else}
							<FileDropZone
								accept={ACCEPT_AUDIO}
								maxFiles={1}
								maxFileSize={5 * MEGABYTE}
								onFileRejected={({ file, reason }) => {
									rpc.notify.error.execute({
										title: 'File rejected',
										description: reason,
									});
								}}
								onUpload={async (files) => {
									const file = files[0];
									if (!file) return;

									const { error } = await services.db.sounds.save(
										soundEvent.key,
										file,
									);
									if (error) {
										rpc.notify.error.execute({
											title: 'Upload failed',
											description:
												'Failed to save custom sound. Please try again.',
											action: { type: 'more-details', error },
										});
										return;
									}

									settings.updateKey(`sound.custom.${soundEvent.key}`, true);
									rpc.notify.success.execute({
										title: 'Custom sound uploaded',
										description: `Custom sound for ${soundEvent.label} has been saved.`,
									});
								}}
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
