import { type } from 'arktype';
import { nanoid } from 'nanoid/non-secure';
import {
	ANTHROPIC_INFERENCE_MODELS,
	GOOGLE_INFERENCE_MODELS,
	GROQ_INFERENCE_MODELS,
	INFERENCE_PROVIDERS,
	OPENAI_INFERENCE_MODELS,
} from '$lib/constants/inference';

export const TRANSFORMATION_STEP_TYPES = [
	'prompt_transform',
	'find_replace',
] as const;

export const TRANSFORMATION_STEP_TYPES_TO_LABELS = {
	prompt_transform: 'Prompt Transform',
	find_replace: 'Find Replace',
} as const satisfies Record<(typeof TRANSFORMATION_STEP_TYPES)[number], string>;

/**
	* The current version of the TransformationStep schema.
	* Increment this when adding new fields or making breaking changes.
	*/
const CURRENT_TRANSFORMATION_STEP_VERSION = 2 as const;

// ============================================================================
// SHARED BASE FIELDS
// ============================================================================
// These are shared between V1 and V2. If V3 needs different base fields,
// create a new base or define V3 from scratch.
// ============================================================================

/**
	* Base fields shared between TransformationStep V1 and V2.
	* FROZEN for V1/V2: Do not modify without considering impact on both versions.
	*
	* Uses arktype's type() directly so we can use .merge() for composition.
	*/
const TransformationStepBase = type({
	id: 'string',
	type: type.enumerated(...TRANSFORMATION_STEP_TYPES),
	'prompt_transform.inference.provider': type.enumerated(
		...INFERENCE_PROVIDERS,
	),
	'prompt_transform.inference.provider.OpenAI.model': type.enumerated(
		...OPENAI_INFERENCE_MODELS,
	),
	'prompt_transform.inference.provider.Groq.model': type.enumerated(
		...GROQ_INFERENCE_MODELS,
	),
	'prompt_transform.inference.provider.Anthropic.model': type.enumerated(
		...ANTHROPIC_INFERENCE_MODELS,
	),
	'prompt_transform.inference.provider.Google.model': type.enumerated(
		...GOOGLE_INFERENCE_MODELS,
	),
	// OpenRouter model is a free string (user can enter any model)
	'prompt_transform.inference.provider.OpenRouter.model': 'string',
	'prompt_transform.systemPromptTemplate': 'string',
	'prompt_transform.userPromptTemplate': 'string',
	'find_replace.findText': 'string',
	'find_replace.replaceText': 'string',
	'find_replace.useRegex': 'boolean',
});

// ============================================================================
// VERSION 1 (FROZEN)
// ============================================================================

/**
	* V1: Original schema without Custom provider fields.
	* Old data has no version field, so we default to 1.
	*
	* FROZEN: Do not modify. This represents the historical V1 schema.
	*/
const TransformationStepV1 = TransformationStepBase.merge({
	version: '1 = 1',
});

type TransformationStepV1 = typeof TransformationStepV1.infer;

/**
 * V1: Transformation with V1 steps (before Custom provider fields).
 * FROZEN: Do not modify. This represents the historical V1 schema.
 */
const TransformationV1 = type({
	id: 'string',
	title: 'string',
	description: 'string',
	createdAt: 'string',
	updatedAt: 'string',
	steps: [TransformationStepV1, '[]'],
});

export type TransformationV1 = typeof TransformationV1.infer;

// ============================================================================
// VERSION 2 (CURRENT) - STEP
// ============================================================================

/**
 * V2: Added Custom provider fields for local LLM endpoints.
 * - Custom.model: Model name for custom endpoints
 * - Custom.baseUrl: Per-step base URL (falls back to global setting)
 *
 * CURRENT VERSION: This is the latest schema.
 */
const TransformationStepV2 = TransformationStepBase.merge({
	version: '2',
	/** Custom provider for local LLM endpoints (Ollama, LM Studio, llama.cpp, etc.) */
	'prompt_transform.inference.provider.Custom.model': 'string',
	/**
	 * Per-step base URL for custom endpoints. Allows different steps to use
	 * different local services (e.g., Ollama on :11434, LM Studio on :1234).
	 * Falls back to global `completion.Custom.baseUrl` setting if empty.
	 */
	'prompt_transform.inference.provider.Custom.baseUrl': 'string',
});

type TransformationStepV2 = typeof TransformationStepV2.infer;

// ============================================================================
// VERSION 2 (CURRENT) - TRANSFORMATION
// ============================================================================

/**
 * V2 (current): Transformation with V2 steps (has Custom provider fields).
 * CURRENT VERSION: This is the latest schema.
 */
const TransformationV2 = type({
	id: 'string',
	title: 'string',
	description: 'string',
	createdAt: 'string',
	updatedAt: 'string',
	steps: [TransformationStepV2, '[]'],
});

export type TransformationV2 = typeof TransformationV2.infer;

// ============================================================================
// MIGRATING VALIDATOR
// ============================================================================

/**
 * Transformation validator with automatic migration.
 *
 * Input: Raw object with V1 steps (no Custom provider) or V2 steps.
 * Output: Always returns the latest schema (V2) with V2 steps.
 *         V1 inputs have their steps automatically migrated via .pipe().
 */
export const Transformation = TransformationV1.or(TransformationV2).pipe(
	(transformation): TransformationV2 => ({
		...transformation,
		steps: transformation.steps.map((step): TransformationStepV2 => {
			// Check for V2 first - TypeScript narrows step to TransformationStepV2
			if (step.version === 2) {
				return step;
			}
			// Now step is narrowed to TransformationStepV1
			return {
				...step,
				version: 2,
				'prompt_transform.inference.provider.Custom.model': '',
				'prompt_transform.inference.provider.Custom.baseUrl': '',
			};
		}),
	}),
);

/** Derived from the migrating validator's output type. */
export type Transformation = typeof Transformation.infer;

/**
 * TransformationStep type alias for the current version.
 * Derived from Transformation to keep types in sync.
 */
export type TransformationStep = Transformation['steps'][number];

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function generateDefaultTransformation(): Transformation {
	const now = new Date().toISOString();
	return {
		id: nanoid(),
		title: '',
		description: '',
		steps: [],
		createdAt: now,
		updatedAt: now,
	};
}

export function generateDefaultTransformationStep(): TransformationStep {
	return {
		version: CURRENT_TRANSFORMATION_STEP_VERSION,
		id: nanoid(),
		type: 'prompt_transform',
		'prompt_transform.inference.provider': 'Google',
		'prompt_transform.inference.provider.OpenAI.model': 'gpt-4o',
		'prompt_transform.inference.provider.Groq.model': 'llama-3.3-70b-versatile',
		'prompt_transform.inference.provider.Anthropic.model': 'claude-sonnet-4-0',
		'prompt_transform.inference.provider.Google.model': 'gemini-2.5-flash',
		'prompt_transform.inference.provider.OpenRouter.model':
			'mistralai/mixtral-8x7b',
		// Empty strings for Custom provider - user must configure when switching to Custom
		// baseUrl falls back to global setting in transformer.ts
		'prompt_transform.inference.provider.Custom.model': '',
		'prompt_transform.inference.provider.Custom.baseUrl': '',

		'prompt_transform.systemPromptTemplate': '',
		'prompt_transform.userPromptTemplate': '',

		'find_replace.findText': '',
		'find_replace.replaceText': '',
		'find_replace.useRegex': false,
	};
}
