import { describe, expect, it } from 'vitest';
import {
  localDayKey,
  nextLocalMidnight,
  splitAtLocalMidnights,
  startOfLocalDay,
} from './day';

const hour = 60 * 60 * 1_000;
const maxDateTimestamp = 8_640_000_000_000_000;

describe('local day helpers', () => {
  it('runs date tests in the Europe/Prague timezone', () => {
    expect(process.env.TZ).toBe('Europe/Prague');
  });

  it('formats the current local day as YYYY-MM-DD', () => {
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    expect(localDayKey(now.getTime())).toBe(expected);
  });

  it('returns the start of the local day', () => {
    const timestamp = new Date(2026, 0, 15, 16, 45, 12, 345).getTime();

    expect(startOfLocalDay(timestamp)).toBe(new Date(2026, 0, 15).getTime());
  });

  it('returns the next local midnight', () => {
    const timestamp = new Date(2026, 0, 15, 16, 45, 12, 345).getTime();

    expect(nextLocalMidnight(timestamp)).toBe(new Date(2026, 0, 16).getTime());
  });

  it('pads local years before 1000 to four digits', () => {
    const date = new Date(2000, 0, 2, 12);
    date.setFullYear(9);

    expect(localDayKey(date.getTime())).toBe('0009-01-02');
  });

  it('keeps the start of a local day in a year from 0000 through 0099', () => {
    const date = new Date(2000, 0, 2, 12, 34, 56, 789);
    date.setFullYear(9);
    const expected = new Date(2000, 0, 2);
    expected.setFullYear(9);

    expect(startOfLocalDay(date.getTime())).toBe(expected.getTime());
  });

  it('advances from year 0009 to year 0010 at the next local midnight', () => {
    const date = new Date(2000, 11, 31, 12);
    date.setFullYear(9);
    const expected = new Date(2000, 0, 1);
    expected.setFullYear(10);

    expect(nextLocalMidnight(date.getTime())).toBe(expected.getTime());
  });
});

describe('splitAtLocalMidnights', () => {
  it('keeps a same-day interval as one piece', () => {
    const start = new Date(2026, 0, 15, 10).getTime();
    const end = new Date(2026, 0, 15, 12).getTime();

    expect(splitAtLocalMidnights(start, end)).toEqual([
      { dayKey: '2026-01-15', start, end },
    ]);
  });

  it('splits a midnight crossing without gaps, overlaps, or lost time', () => {
    const start = new Date(2026, 0, 15, 23, 30).getTime();
    const midnight = new Date(2026, 0, 16).getTime();
    const end = new Date(2026, 0, 16, 0, 30).getTime();

    const pieces = splitAtLocalMidnights(start, end);

    expect(pieces).toEqual([
      { dayKey: '2026-01-15', start, end: midnight },
      { dayKey: '2026-01-16', start: midnight, end },
    ]);
    expect(pieces.reduce((sum, piece) => sum + piece.end - piece.start, 0))
      .toBe(end - start);
  });

  it('splits an interval spanning multiple complete local days', () => {
    const start = new Date(2026, 0, 15, 23).getTime();
    const january16 = new Date(2026, 0, 16).getTime();
    const january17 = new Date(2026, 0, 17).getTime();
    const january18 = new Date(2026, 0, 18).getTime();
    const end = new Date(2026, 0, 18, 1).getTime();

    expect(splitAtLocalMidnights(start, end)).toEqual([
      { dayKey: '2026-01-15', start, end: january16 },
      { dayKey: '2026-01-16', start: january16, end: january17 },
      { dayKey: '2026-01-17', start: january17, end: january18 },
      { dayKey: '2026-01-18', start: january18, end },
    ]);
  });

  it('uses a 23-hour local day across the Europe/Prague spring DST boundary', () => {
    const start = new Date(2026, 2, 28, 23, 30).getTime();
    const march29 = new Date(2026, 2, 29).getTime();
    const march30 = new Date(2026, 2, 30).getTime();
    const end = new Date(2026, 2, 30, 0, 30).getTime();

    const pieces = splitAtLocalMidnights(start, end);

    expect(march30 - march29).toBe(23 * hour);
    expect(pieces).toEqual([
      { dayKey: '2026-03-28', start, end: march29 },
      { dayKey: '2026-03-29', start: march29, end: march30 },
      { dayKey: '2026-03-30', start: march30, end },
    ]);
    expect(pieces.reduce((sum, piece) => sum + piece.end - piece.start, 0))
      .toBe(end - start);
  });

  it('uses a 25-hour local day across the Europe/Prague fall DST boundary', () => {
    const start = new Date(2026, 9, 24, 23, 30).getTime();
    const october25 = new Date(2026, 9, 25).getTime();
    const october26 = new Date(2026, 9, 26).getTime();
    const end = new Date(2026, 9, 26, 0, 30).getTime();

    const pieces = splitAtLocalMidnights(start, end);

    expect(october26 - october25).toBe(25 * hour);
    expect(pieces).toEqual([
      { dayKey: '2026-10-24', start, end: october25 },
      { dayKey: '2026-10-25', start: october25, end: october26 },
      { dayKey: '2026-10-26', start: october26, end },
    ]);
    expect(pieces.reduce((sum, piece) => sum + piece.end - piece.start, 0))
      .toBe(end - start);
  });

  it('keeps a one-millisecond interval at the minimum Date boundary', () => {
    const start = -maxDateTimestamp;
    const end = start + 1;

    const pieces = splitAtLocalMidnights(start, end);

    expect(pieces).toEqual([{ dayKey: localDayKey(start), start, end }]);
    expect(pieces.reduce((sum, piece) => sum + piece.end - piece.start, 0))
      .toBe(end - start);
  });

  it('keeps a one-millisecond interval at the maximum Date boundary', () => {
    const end = maxDateTimestamp;
    const start = end - 1;

    const pieces = splitAtLocalMidnights(start, end);

    expect(pieces).toEqual([{ dayKey: localDayKey(start), start, end }]);
    expect(pieces.reduce((sum, piece) => sum + piece.end - piece.start, 0))
      .toBe(end - start);
  });

  it.each([
    [0, 0],
    [1, 0],
    [Number.NaN, 1],
    [0, Number.NaN],
    [Number.NEGATIVE_INFINITY, 1],
    [0, Number.POSITIVE_INFINITY],
  ])('returns no pieces for invalid or non-positive interval [%s, %s)', (start, end) => {
    expect(splitAtLocalMidnights(start, end)).toEqual([]);
  });
});
