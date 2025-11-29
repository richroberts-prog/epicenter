# Data Layer Refactor: `transcribedText` → `transcript`

## Overview

This spec documents the complete list of files and line numbers that need to be updated to rename the `transcribedText` field to `transcript` in the data layer. The UI layer labels have already been updated to display "Transcript".

## Files to Update

### 1. Type Definitions

#### `apps/whispering/src/lib/services/db/models/recordings.ts`
| Line | Current | Change To |
|------|---------|-----------|
| 25 | `transcribedText: string;` | `transcript: string;` |
| 95 | `transcribedText: string;` | `transcript: string;` |

### 2. File System Serialization

#### `apps/whispering/src/lib/services/db/file-system.ts`
| Line | Current | Change To |
|------|---------|-----------|
| 23 | Comment: `Schema validator for Recording front matter (everything except transcribedText)` | `...except transcript)` |
| 41 | `const { transcribedText, ...frontMatter } = recording;` | `const { transcript, ...frontMatter } = recording;` |
| 42 | `return matter.stringify(transcribedText ?? '', frontMatter);` | `return matter.stringify(transcript ?? '', frontMatter);` |
| 57 | `transcribedText: body,` | `transcript: body,` |

### 3. Query Layer

#### `apps/whispering/src/lib/query/transcription.ts`
| Line | Current | Change To |
|------|---------|-----------|
| 55 | `const { data: transcribedText, error: transcribeError } =` | `const { data: transcript, error: transcribeError } =` |
| 80 | `transcribedText,` | `transcript,` |
| 94 | `return Ok(transcribedText);` | `return Ok(transcript);` |

#### `apps/whispering/src/lib/query/actions.ts`
| Line | Current | Change To |
|------|---------|-----------|
| 631 | `transcribedText: '',` | `transcript: '',` |
| 664 | `const { data: transcribedText, error: transcribeError } =` | `const { data: transcript, error: transcribeError } =` |
| 684 | `text: transcribedText,` | `text: transcript,` |

#### `apps/whispering/src/lib/query/transformer.ts`
| Line | Current | Change To |
|------|---------|-----------|
| 115 | `input: recording.transcribedText,` | `input: recording.transcript,` |

### 4. Components

#### `apps/whispering/src/routes/(app)/+page.svelte`
| Line | Current | Change To |
|------|---------|-----------|
| 54 | `transcribedText: '',` | `transcript: '',` |
| 67 | `!latestRecording.transcribedText?.trim(),` | `!latestRecording.transcript?.trim(),` |
| 320-321 | `transcribedText={latestRecording.transcriptionStatus ===` | `transcript={latestRecording.transcriptionStatus ===` |
| 323 | `: latestRecording.transcribedText}` | `: latestRecording.transcript}` |
| 331 | `textToCopy={latestRecording.transcribedText}` | `textToCopy={latestRecording.transcript}` |
| 334 | `propertyName: 'transcribedText',` | `propertyName: 'transcript',` |

#### `apps/whispering/src/routes/(app)/(config)/recordings/+page.svelte`
| Line | Current | Change To |
|------|---------|-----------|
| 98 | `const transcribedText = String(row.getValue('transcribedText'));` | `const transcript = String(row.getValue('transcript'));` |
| 102 | `transcribedText.toLowerCase().includes(filterValue.toLowerCase())` | `transcript.toLowerCase().includes(filterValue.toLowerCase())` |
| 171 | `accessorKey: 'transcribedText',` | `accessorKey: 'transcript',` |
| 178 | `const transcribedText = getValue<string>();` | `const transcript = getValue<string>();` |
| 179 | `if (!transcribedText) return;` | `if (!transcript) return;` |
| 182 | `transcribedText,` | `transcript,` |
| 334 | `let template = $state('{{timestamp}} {{transcribedText}}');` | `let template = $state('{{timestamp}} {{transcript}}');` |
| 342 | `.filter((recording) => recording.transcribedText !== '')` | `.filter((recording) => recording.transcript !== '')` |

#### `apps/whispering/src/routes/(app)/(config)/recordings/row-actions/EditRecordingModal.svelte`
| Line | Current | Change To |
|------|---------|-----------|
| 174 | `<Label for="transcribedText" class="text-right">Transcript</Label>` | `<Label for="transcript" class="text-right">Transcript</Label>` |
| 176 | `id="transcribedText"` | `id="transcript"` |
| 177 | `value={workingCopy.transcribedText}` | `value={workingCopy.transcript}` |
| 181 | `transcribedText: e.currentTarget.value,` | `transcript: e.currentTarget.value,` |

#### `apps/whispering/src/routes/(app)/(config)/recordings/row-actions/RecordingRowActions.svelte`
| Line | Current | Change To |
|------|---------|-----------|
| 82 | `onSuccess: (transcribedText) => {` | `onSuccess: (transcript) => {` |
| 86 | `text: transcribedText,` | `text: transcript,` |
| 112 | `textToCopy={recording.transcribedText}` | `textToCopy={recording.transcript}` |
| 115 | `propertyName: 'transcribedText',` | `propertyName: 'transcript',` |

#### `apps/whispering/src/lib/components/copyable/TranscriptDialog.svelte`
| Line | Current | Change To |
|------|---------|-----------|
| 15 | `transcribedText={recording.transcribedText}` | `transcript={recording.transcript}` |
| 24 | `transcribedText,` | `transcript,` |
| 31 | `transcribedText: string;` | `transcript: string;` |
| 38 | `propertyName: 'transcribedText',` | `propertyName: 'transcript',` |
| 46 | `text={transcribedText}` | `text={transcript}` |

#### `apps/whispering/src/lib/components/MigrationDialog.svelte`
| Line | Current | Change To |
|------|---------|-----------|
| 82 | `const transcribedText = textLengths[index % textLengths.length];` | `const transcript = textLengths[index % textLengths.length];` |
| 94 | `transcribedText,` | `transcript,` |

### 5. JSDoc Comments

#### `apps/whispering/src/lib/services/db/models/transformation-runs.ts`
| Line | Current | Change To |
|------|---------|-----------|
| 65-66 | `Because the recording's transcribedText can change after invoking, we store a snapshot of the transcribedText at the time of invoking.` | `Because the recording's transcript can change after invoking, we store a snapshot of the transcript at the time of invoking.` |

## Summary

| Category | Files | Changes |
|----------|-------|---------|
| Type Definitions | 1 | 2 |
| File System | 1 | 4 |
| Query Layer | 3 | 7 |
| Components | 6 | 26 |
| JSDoc | 1 | 1 |
| **Total** | **11** | **40** |

## Data Compatibility

The transcript content is stored as the markdown body (not in YAML frontmatter). This means:
- No migration needed for existing data files
- Code changes simply read/write the body as `transcript` instead of `transcribedText`
- All changes must be made simultaneously since this is a breaking change

## Testing Checklist

After making changes, verify:
- [ ] Create new recording and verify transcript saves
- [ ] Edit existing recording's transcript and verify it persists
- [ ] Run transcription and verify transcript field updates
- [ ] Copy transcript to clipboard works
- [ ] Recordings table displays transcript column correctly
- [ ] Existing recordings still load correctly
- [ ] Transformation runs can access transcript

## Implementation Tasks

- [ ] Update Recording type in `models/recordings.ts` (2 lines)
- [ ] Update `file-system.ts` serialization (4 lines)
- [ ] Update `transcription.ts` query (3 lines)
- [ ] Update `actions.ts` query (3 lines)
- [ ] Update `transformer.ts` query (1 line)
- [ ] Update `+page.svelte` main page (6 lines)
- [ ] Update `recordings/+page.svelte` table (8 lines)
- [ ] Update `EditRecordingModal.svelte` (4 lines)
- [ ] Update `RecordingRowActions.svelte` (4 lines)
- [ ] Update `TranscriptDialog.svelte` (5 lines)
- [ ] Update `MigrationDialog.svelte` (2 lines)
- [ ] Update JSDoc in `transformation-runs.ts` (1 comment)
