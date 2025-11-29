<script lang="ts">
	import TextPreviewDialog from '$lib/components/copyable/TextPreviewDialog.svelte';
	import { getRecordingTransitionId } from '$lib/utils/getRecordingTransitionId';

	/**
	 * A domain-specific wrapper around TextPreviewDialog for displaying transcript content.
	 *
	 * This component ensures consistent presentation of transcripts across the application
	 * by automatically setting the correct title, label, and transition ID pattern.
	 *
	 * @example
	 * ```svelte
	 * <TranscriptDialog
	 *   recordingId={recording.id}
	 *   transcript={recording.transcript}
	 *   rows={1}
	 * />
	 * ```
	 */
	let {
		/** The ID of the recording whose transcript is being displayed */
		recordingId,
		/** The transcript content to display */
		transcript,
		/** Number of rows for the preview textarea (default: 2) */
		rows = 2,
		/** Whether the dialog trigger is disabled */
		disabled = false,
	}: {
		recordingId: string;
		transcript: string;
		rows?: number;
		disabled?: boolean;
	} = $props();

	const id = getRecordingTransitionId({
		recordingId,
		propertyName: 'transcript',
	});
</script>

<TextPreviewDialog
	{id}
	title="Transcript"
	label="transcript"
	text={transcript}
	{rows}
	{disabled}
/>
