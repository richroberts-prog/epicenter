/**
 * @fileoverview Temporal-based ZonedDateTime utilities
 *
 * Uses the Temporal API (via polyfill) for timezone-aware date handling.
 * Stores dates as RFC 9557 strings: "2024-01-15T14:30:00-05:00[America/New_York]"
 *
 * When native Temporal ships in browsers/runtimes, just remove the polyfill import.
 */

import { regex } from 'arkregex';
import { Temporal } from 'temporal-polyfill';
import type { Brand } from 'wellcrafted/brand';

export { Temporal };

/**
 * Regex pattern for RFC 9557 ZonedDateTime string validation.
 * Used for JSON Schema `pattern` field. Actual validation uses Temporal.ZonedDateTime.from().
 *
 * Format: `YYYY-MM-DDTHH:mm:ss[.sss]±HH:mm[TimeZone]` or `YYYY-MM-DDTHH:mm:ss[.sss]Z[TimeZone]`
 */
export const ZONED_DATETIME_STRING_REGEX = regex(
	'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})\\[[A-Za-z][A-Za-z0-9_/+-]*\\]$',
);

/**
 * RFC 9557 ZonedDateTime string format from Temporal.ZonedDateTime.toString().
 *
 * Format: `YYYY-MM-DDTHH:mm:ss.sssssssss±HH:mm[TimeZone]`
 *
 * @example "2024-01-15T14:30:00-05:00[America/New_York]"
 * @example "2024-01-15T19:30:00+00:00[UTC]"
 * @example "2024-01-15T23:30:00+09:00[Asia/Tokyo]"
 */
export type ZonedDateTimeString = string & Brand<'ZonedDateTimeString'>;

/**
 * Type guard to check if a value is a valid ZonedDateTimeString.
 *
 * Uses Temporal's native parsing for validation; no regex needed.
 * This validates both the format AND the timezone identifier.
 *
 * @param value - Value to check
 * @returns true if value is a valid ZonedDateTimeString
 *
 * @example
 * ```typescript
 * isZonedDateTimeString("2024-01-15T14:30:00-05:00[America/New_York]") // true
 * isZonedDateTimeString("2024-01-15T14:30:00[America/New_York]") // true (offset inferred)
 * isZonedDateTimeString("2024-01-15T14:30:00-05:00") // false (no timezone)
 * isZonedDateTimeString("2024-01-15T19:30:00.000Z") // false (Instant format, not ZonedDateTime)
 * isZonedDateTimeString("invalid") // false
 * ```
 */
export function isZonedDateTimeString(
	value: unknown,
): value is ZonedDateTimeString {
	if (typeof value !== 'string') return false;
	try {
		Temporal.ZonedDateTime.from(value);
		return true;
	} catch {
		return false;
	}
}

/**
 * Parse a ZonedDateTimeString into a Temporal.ZonedDateTime object.
 *
 * Use this when you need to do date math, comparisons, or access components.
 *
 * @param stored - ZonedDateTimeString from storage
 * @returns Temporal.ZonedDateTime object
 *
 * @example
 * ```typescript
 * const stored = "2024-01-15T14:30:00-05:00[America/New_York]" as ZonedDateTimeString;
 * const zdt = parseZonedDateTime(stored);
 *
 * zdt.year;        // 2024
 * zdt.hour;        // 14
 * zdt.timeZoneId;  // "America/New_York"
 *
 * // Date math
 * const tomorrow = zdt.add({ days: 1 });
 * const diff = tomorrow.since(zdt);
 * ```
 */
export function parseZonedDateTime(
	stored: ZonedDateTimeString,
): Temporal.ZonedDateTime {
	return Temporal.ZonedDateTime.from(stored);
}

/**
 * Convert a Temporal.ZonedDateTime to a storage string.
 *
 * @param zdt - Temporal.ZonedDateTime object
 * @returns ZonedDateTimeString for storage
 *
 * @example
 * ```typescript
 * const zdt = Temporal.Now.zonedDateTimeISO('America/New_York');
 * const stored = toZonedDateTimeString(zdt);
 * // "2024-01-15T14:30:00-05:00[America/New_York]"
 * ```
 */
export function toZonedDateTimeString(
	zdt: Temporal.ZonedDateTime,
): ZonedDateTimeString {
	return zdt.toString() as ZonedDateTimeString;
}

/**
 * Create a ZonedDateTimeString for the current moment.
 *
 * @param timeZone - IANA timezone identifier (defaults to system timezone)
 * @returns ZonedDateTimeString for the current moment
 *
 * @example
 * ```typescript
 * // Current time in system timezone
 * const now = nowZonedDateTimeString();
 *
 * // Current time in specific timezone
 * const nyNow = nowZonedDateTimeString('America/New_York');
 * const tokyoNow = nowZonedDateTimeString('Asia/Tokyo');
 * ```
 */
export function nowZonedDateTimeString(
	timeZone: string = Temporal.Now.timeZoneId(),
): ZonedDateTimeString {
	return Temporal.Now.zonedDateTimeISO(timeZone).toString() as ZonedDateTimeString;
}

/**
 * Create a ZonedDateTimeString from an instant and timezone.
 *
 * Use this when you have a UTC timestamp and want to store it with a specific timezone.
 *
 * @param instant - Temporal.Instant or ISO string with offset/Z
 * @param timeZone - IANA timezone identifier
 * @returns ZonedDateTimeString
 *
 * @example
 * ```typescript
 * // From Temporal.Instant
 * const instant = Temporal.Now.instant();
 * const stored = createZonedDateTimeString(instant, 'America/New_York');
 *
 * // From ISO string with Z
 * const stored = createZonedDateTimeString('2024-01-15T19:30:00.000Z', 'America/New_York');
 * // "2024-01-15T14:30:00-05:00[America/New_York]"
 * ```
 */
export function createZonedDateTimeString(
	instant: Temporal.Instant | string,
	timeZone: string,
): ZonedDateTimeString {
	const inst =
		typeof instant === 'string' ? Temporal.Instant.from(instant) : instant;
	return inst.toZonedDateTimeISO(timeZone).toString() as ZonedDateTimeString;
}

/**
 * Parse various date string formats into a ZonedDateTime.
 *
 * Supports:
 * - ZonedDateTime format: "2024-01-15T14:30:00-05:00[America/New_York]"
 * - ZonedDateTime without offset: "2024-01-15T14:30:00[America/New_York]" (offset inferred)
 * - Instant format with fallback timezone: "2024-01-15T19:30:00.000Z" + timezone param
 * - Instant with offset: "2024-01-15T14:30:00-05:00" + timezone param
 *
 * @param input - Date string to parse
 * @param fallbackTimeZone - Timezone to use for Instant formats (defaults to system)
 * @returns Temporal.ZonedDateTime
 * @throws Error if the string cannot be parsed
 *
 * @example
 * ```typescript
 * // ZonedDateTime format (preferred)
 * toZonedDateTime("2024-01-15T14:30:00-05:00[America/New_York]");
 *
 * // Instant format with timezone
 * toZonedDateTime("2024-01-15T19:30:00.000Z", "America/New_York");
 *
 * // Instant with offset (timezone for context)
 * toZonedDateTime("2024-01-15T14:30:00-05:00", "America/New_York");
 * ```
 */
export function toZonedDateTime(
	input: string,
	fallbackTimeZone?: string,
): Temporal.ZonedDateTime {
	// Try ZonedDateTime format first (has timezone in brackets)
	try {
		return Temporal.ZonedDateTime.from(input);
	} catch {
		// Fall through to Instant parsing
	}

	// Try Instant format (ISO with Z or offset) + timezone
	const timeZone = fallbackTimeZone ?? Temporal.Now.timeZoneId();
	try {
		return Temporal.Instant.from(input).toZonedDateTimeISO(timeZone);
	} catch {
		// Fall through to error
	}

	throw new Error(
		`Cannot parse date string: "${input}". ` +
			`Expected ZonedDateTime format "YYYY-MM-DDTHH:mm:ss±HH:mm[TimeZone]" ` +
			`or Instant format "YYYY-MM-DDTHH:mm:ssZ" with fallbackTimeZone parameter.`,
	);
}

/**
 * Extract the timezone identifier from a ZonedDateTimeString.
 *
 * @param stored - ZonedDateTimeString
 * @returns IANA timezone identifier
 *
 * @example
 * ```typescript
 * getTimeZoneId("2024-01-15T14:30:00-05:00[America/New_York]" as ZonedDateTimeString);
 * // "America/New_York"
 * ```
 */
export function getTimeZoneId(stored: ZonedDateTimeString): string {
	return Temporal.ZonedDateTime.from(stored).timeZoneId;
}

/**
 * Extract the instant (UTC point in time) from a ZonedDateTimeString.
 *
 * @param stored - ZonedDateTimeString
 * @returns Temporal.Instant
 *
 * @example
 * ```typescript
 * const instant = getInstant("2024-01-15T14:30:00-05:00[America/New_York]" as ZonedDateTimeString);
 * instant.toString(); // "2024-01-15T19:30:00Z"
 * ```
 */
export function getInstant(stored: ZonedDateTimeString): Temporal.Instant {
	return Temporal.ZonedDateTime.from(stored).toInstant();
}

/**
 * Compare two ZonedDateTimeStrings chronologically.
 *
 * Returns negative if a < b, positive if a > b, zero if equal.
 *
 * @example
 * ```typescript
 * const dates = [date2, date1, date3];
 * dates.sort(compareZonedDateTimeStrings); // Chronological order
 * ```
 */
export function compareZonedDateTimeStrings(
	a: ZonedDateTimeString,
	b: ZonedDateTimeString,
): number {
	return Temporal.ZonedDateTime.compare(
		Temporal.ZonedDateTime.from(a),
		Temporal.ZonedDateTime.from(b),
	);
}

/**
 * Convert a legacy DateWithTimezoneString (pipe format) to ZonedDateTimeString.
 *
 * Legacy format: "2024-01-15T19:30:00.000Z|America/New_York"
 * New format: "2024-01-15T14:30:00-05:00[America/New_York]"
 *
 * @param legacy - Legacy pipe-separated format
 * @returns ZonedDateTimeString in Temporal format
 *
 * @example
 * ```typescript
 * migrateLegacyDateString("2024-01-15T19:30:00.000Z|America/New_York");
 * // "2024-01-15T14:30:00-05:00[America/New_York]"
 * ```
 */
export function migrateLegacyDateString(legacy: string): ZonedDateTimeString {
	if (!legacy.includes('|')) {
		// Already new format or invalid
		return Temporal.ZonedDateTime.from(legacy).toString() as ZonedDateTimeString;
	}

	const pipeIndex = legacy.indexOf('|');
	const isoUtc = legacy.slice(0, pipeIndex);
	const timeZone = legacy.slice(pipeIndex + 1);

	return Temporal.Instant.from(isoUtc)
		.toZonedDateTimeISO(timeZone)
		.toString() as ZonedDateTimeString;
}

/**
 * Check if a string is in the legacy pipe-separated format.
 *
 * @param value - String to check
 * @returns true if it's the legacy format
 */
export function isLegacyDateString(value: string): boolean {
	// Legacy format: exactly 24 chars ISO + pipe + timezone
	// e.g., "2024-01-15T19:30:00.000Z|America/New_York"
	return (
		value.length > 25 &&
		value[24] === '|' &&
		value.includes('Z|')
	);
}
