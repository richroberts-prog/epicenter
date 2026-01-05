import { describe, expect, test } from 'bun:test';
import { Temporal } from 'temporal-polyfill';
import {
	compareZonedDateTimeStrings,
	createZonedDateTimeString,
	getInstant,
	getTimeZoneId,
	isLegacyDateString,
	isZonedDateTimeString,
	migrateLegacyDateString,
	nowZonedDateTimeString,
	parseZonedDateTime,
	toZonedDateTime,
	toZonedDateTimeString,
	type ZonedDateTimeString,
} from './zoned-datetime';

describe('isZonedDateTimeString', () => {
	test('returns true for valid ZonedDateTime format with offset', () => {
		expect(
			isZonedDateTimeString('2024-01-15T14:30:00-05:00[America/New_York]'),
		).toBe(true);
	});

	test('returns true for ZonedDateTime without offset (inferred)', () => {
		expect(
			isZonedDateTimeString('2024-01-15T14:30:00[America/New_York]'),
		).toBe(true);
	});

	test('returns true for UTC timezone', () => {
		expect(isZonedDateTimeString('2024-01-15T19:30:00+00:00[UTC]')).toBe(true);
	});

	test('returns true for various timezones', () => {
		expect(isZonedDateTimeString('2024-01-15T23:30:00+09:00[Asia/Tokyo]')).toBe(
			true,
		);
		expect(
			isZonedDateTimeString('2024-01-15T14:30:00+00:00[Europe/London]'),
		).toBe(true);
	});

	test('returns false for Instant format (no timezone brackets)', () => {
		expect(isZonedDateTimeString('2024-01-15T19:30:00.000Z')).toBe(false);
		expect(isZonedDateTimeString('2024-01-15T14:30:00-05:00')).toBe(false);
	});

	test('returns false for legacy pipe format', () => {
		expect(
			isZonedDateTimeString('2024-01-15T19:30:00.000Z|America/New_York'),
		).toBe(false);
	});

	test('returns false for invalid strings', () => {
		expect(isZonedDateTimeString('invalid')).toBe(false);
		expect(isZonedDateTimeString('')).toBe(false);
		expect(isZonedDateTimeString('2024-01-15')).toBe(false);
	});

	test('returns false for non-strings', () => {
		expect(isZonedDateTimeString(null)).toBe(false);
		expect(isZonedDateTimeString(undefined)).toBe(false);
		expect(isZonedDateTimeString(123)).toBe(false);
		expect(isZonedDateTimeString({})).toBe(false);
	});
});

describe('parseZonedDateTime', () => {
	test('parses valid ZonedDateTimeString', () => {
		const stored =
			'2024-01-15T14:30:00-05:00[America/New_York]' as ZonedDateTimeString;
		const zdt = parseZonedDateTime(stored);

		expect(zdt.year).toBe(2024);
		expect(zdt.month).toBe(1);
		expect(zdt.day).toBe(15);
		expect(zdt.hour).toBe(14);
		expect(zdt.minute).toBe(30);
		expect(zdt.timeZoneId).toBe('America/New_York');
	});

	test('round-trips correctly', () => {
		const original =
			'2024-01-15T14:30:00-05:00[America/New_York]' as ZonedDateTimeString;
		const zdt = parseZonedDateTime(original);
		const roundTripped = toZonedDateTimeString(zdt);

		expect(roundTripped).toBe(original);
	});
});

describe('toZonedDateTimeString', () => {
	test('converts ZonedDateTime to string', () => {
		const zdt = Temporal.ZonedDateTime.from(
			'2024-01-15T14:30:00-05:00[America/New_York]',
		);
		const str = toZonedDateTimeString(zdt);

		expect(str as string).toBe('2024-01-15T14:30:00-05:00[America/New_York]');
		expect(isZonedDateTimeString(str)).toBe(true);
	});
});

describe('nowZonedDateTimeString', () => {
	test('returns valid ZonedDateTimeString', () => {
		const now = nowZonedDateTimeString('UTC');
		expect(isZonedDateTimeString(now)).toBe(true);
		expect(now).toContain('[UTC]');
	});

	test('respects specified timezone', () => {
		const nyNow = nowZonedDateTimeString('America/New_York');
		expect(nyNow).toContain('[America/New_York]');

		const tokyoNow = nowZonedDateTimeString('Asia/Tokyo');
		expect(tokyoNow).toContain('[Asia/Tokyo]');
	});
});

describe('createZonedDateTimeString', () => {
	test('creates from Temporal.Instant', () => {
		const instant = Temporal.Instant.from('2024-01-15T19:30:00Z');
		const stored = createZonedDateTimeString(instant, 'America/New_York');

		expect(stored).toContain('[America/New_York]');
		expect(isZonedDateTimeString(stored)).toBe(true);

		const zdt = parseZonedDateTime(stored);
		expect(zdt.hour).toBe(14);
	});

	test('creates from ISO string with Z', () => {
		const stored = createZonedDateTimeString(
			'2024-01-15T19:30:00.000Z',
			'America/New_York',
		);

		expect(stored).toContain('[America/New_York]');
		const zdt = parseZonedDateTime(stored);
		expect(zdt.hour).toBe(14);
	});

	test('creates from ISO string with offset', () => {
		const stored = createZonedDateTimeString(
			'2024-01-15T14:30:00-05:00',
			'America/New_York',
		);

		expect(stored).toContain('[America/New_York]');
	});
});

describe('toZonedDateTime', () => {
	test('parses ZonedDateTime format', () => {
		const zdt = toZonedDateTime('2024-01-15T14:30:00-05:00[America/New_York]');

		expect(zdt.year).toBe(2024);
		expect(zdt.hour).toBe(14);
		expect(zdt.timeZoneId).toBe('America/New_York');
	});

	test('parses Instant format with fallback timezone', () => {
		const zdt = toZonedDateTime('2024-01-15T19:30:00.000Z', 'America/New_York');

		expect(zdt.hour).toBe(14);
		expect(zdt.timeZoneId).toBe('America/New_York');
	});

	test('parses Instant with offset and timezone', () => {
		const zdt = toZonedDateTime('2024-01-15T14:30:00-05:00', 'America/New_York');

		expect(zdt.timeZoneId).toBe('America/New_York');
	});

	test('throws for invalid input', () => {
		expect(() => toZonedDateTime('invalid')).toThrow();
	});
});

describe('getTimeZoneId', () => {
	test('extracts timezone from ZonedDateTimeString', () => {
		const stored =
			'2024-01-15T14:30:00-05:00[America/New_York]' as ZonedDateTimeString;
		expect(getTimeZoneId(stored)).toBe('America/New_York');
	});

	test('works with various timezones', () => {
		expect(
			getTimeZoneId('2024-01-15T19:30:00+00:00[UTC]' as ZonedDateTimeString),
		).toBe('UTC');
		expect(
			getTimeZoneId(
				'2024-01-15T23:30:00+09:00[Asia/Tokyo]' as ZonedDateTimeString,
			),
		).toBe('Asia/Tokyo');
	});
});

describe('getInstant', () => {
	test('extracts UTC instant from ZonedDateTimeString', () => {
		const stored =
			'2024-01-15T14:30:00-05:00[America/New_York]' as ZonedDateTimeString;
		const instant = getInstant(stored);

		expect(instant.toString()).toBe('2024-01-15T19:30:00Z');
	});
});

describe('compareZonedDateTimeStrings', () => {
	test('returns negative when first is earlier', () => {
		const earlier =
			'2024-01-15T10:00:00-05:00[America/New_York]' as ZonedDateTimeString;
		const later =
			'2024-01-15T14:00:00-05:00[America/New_York]' as ZonedDateTimeString;

		expect(compareZonedDateTimeStrings(earlier, later)).toBeLessThan(0);
	});

	test('returns positive when first is later', () => {
		const earlier =
			'2024-01-15T10:00:00-05:00[America/New_York]' as ZonedDateTimeString;
		const later =
			'2024-01-15T14:00:00-05:00[America/New_York]' as ZonedDateTimeString;

		expect(compareZonedDateTimeStrings(later, earlier)).toBeGreaterThan(0);
	});

	test('returns zero when equal', () => {
		const a =
			'2024-01-15T14:30:00-05:00[America/New_York]' as ZonedDateTimeString;
		const b =
			'2024-01-15T14:30:00-05:00[America/New_York]' as ZonedDateTimeString;

		expect(compareZonedDateTimeStrings(a, b)).toBe(0);
	});

	test('compares correctly across timezones (same instant)', () => {
		const ny =
			'2024-01-15T14:30:00-05:00[America/New_York]' as ZonedDateTimeString;
		const utc = '2024-01-15T19:30:00+00:00[UTC]' as ZonedDateTimeString;

		expect(compareZonedDateTimeStrings(ny, utc)).toBe(0);
	});

	test('can be used with Array.sort', () => {
		const dates: ZonedDateTimeString[] = [
			'2024-01-15T14:00:00-05:00[America/New_York]' as ZonedDateTimeString,
			'2024-01-15T10:00:00-05:00[America/New_York]' as ZonedDateTimeString,
			'2024-01-15T12:00:00-05:00[America/New_York]' as ZonedDateTimeString,
		];

		const sorted = [...dates].sort(compareZonedDateTimeStrings);

		expect(sorted[0]).toContain('T10:00:00');
		expect(sorted[1]).toContain('T12:00:00');
		expect(sorted[2]).toContain('T14:00:00');
	});
});

describe('isLegacyDateString', () => {
	test('returns true for legacy pipe format', () => {
		expect(isLegacyDateString('2024-01-15T19:30:00.000Z|America/New_York')).toBe(
			true,
		);
		expect(isLegacyDateString('2024-01-15T19:30:00.000Z|UTC')).toBe(true);
	});

	test('returns false for new format', () => {
		expect(
			isLegacyDateString('2024-01-15T14:30:00-05:00[America/New_York]'),
		).toBe(false);
	});

	test('returns false for plain ISO strings', () => {
		expect(isLegacyDateString('2024-01-15T19:30:00.000Z')).toBe(false);
	});
});

describe('migrateLegacyDateString', () => {
	test('converts legacy pipe format to new format', () => {
		const legacy = '2024-01-15T19:30:00.000Z|America/New_York';
		const migrated = migrateLegacyDateString(legacy);

		expect(isZonedDateTimeString(migrated)).toBe(true);
		expect(migrated).toContain('[America/New_York]');

		const zdt = parseZonedDateTime(migrated);
		expect(zdt.hour).toBe(14);
		expect(zdt.timeZoneId).toBe('America/New_York');
	});

	test('preserves UTC correctly', () => {
		const legacy = '2024-01-15T19:30:00.000Z|UTC';
		const migrated = migrateLegacyDateString(legacy);

		expect(migrated).toContain('[UTC]');
		const zdt = parseZonedDateTime(migrated);
		expect(zdt.hour).toBe(19);
	});

	test('passes through already-migrated strings', () => {
		const newFormat = '2024-01-15T14:30:00-05:00[America/New_York]';
		const result = migrateLegacyDateString(newFormat);

		expect(result as string).toBe(newFormat);
	});
});
