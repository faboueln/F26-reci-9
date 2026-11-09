
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Generator that always creates valid intervals.
const interval: fc.Arbitrary<Interval> = fc
  .tuple(
    fc.integer({ min: -20, max: 20 }),
    fc.integer({ min: -20, max: 20 })
  )
  .map(([a, b]): Interval => [
    Math.min(a, b),
    Math.max(a, b)
  ]);

const intervalList = fc.array(interval);

// Generate intervals that are already sorted and separated.
const disjointIntervals = fc
  .array(
    fc.tuple(
      fc.integer({ min: 0, max: 5 }),
      fc.integer({ min: 1, max: 5 })
    ),
    { maxLength: 10 }
  )
  .map(pairs => {
    let position = -20;
    const result: Interval[] = [];

    for (const [length, gap] of pairs) {
      const start = position + gap;
      const end = start + length;
      result.push([start, end]);
      position = end;
    }

    return result;
  });

describe('mergeIntervals', () => {

  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(
          ([s, e]) => !out.some(([a, b]) => a <= s && e <= b)
        );
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Pattern: invariant. Output intervals are sorted and do not overlap or touch.
  it('output intervals are sorted and disjoint', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);

        for (let i = 1; i < out.length; i++) {
          expect(out[i - 1][1]).toBeLessThan(out[i][0]);
        }
      }),
    );
  });

  // Pattern: differential. Input and output cover exactly the same points.
  it('input and output cover the same points', () => {
    fc.assert(
      fc.property(
        intervalList,
        fc.integer({ min: -20, max: 20 }),
        (xs, p) => {
          const out = mergeIntervals(xs);

          const points = [
            p,
            ...xs.flatMap(([s, e]) => [s, e]),
            ...xs.flatMap(([s, e]) => [s + 0.5, e - 0.5])
          ];

          for (const point of points) {
            const inputCovers = xs.some(
              ([s, e]) => s <= point && point <= e
            );
            const outputCovers = out.some(
              ([s, e]) => s <= point && point <= e
            );

            expect(outputCovers).toBe(inputCovers);
          }
        }
      ),
    );
  });

  // Pattern: metamorphic. Changing input order should not change the result.
  it('reversing the input gives the same result', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const original = mergeIntervals(xs);
        const reversed = mergeIntervals([...xs].reverse());

        expect(reversed).toEqual(original);
      }),
    );
  });

  // Pattern: algebraic. Merging twice gives the same result as merging once.
  it('merging twice gives the same result', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        const twice = mergeIntervals(once);

        expect(twice).toEqual(once);
      }),
    );
  });

  // Pattern: conditional. Already disjoint intervals should stay unchanged.
  it('already disjoint intervals stay unchanged', () => {
    fc.assert(
      fc.property(disjointIntervals, xs => {
        const out = mergeIntervals(xs);

        expect(out).toEqual(xs);
      }),
    );
  });

  // Pattern: invariant. The function should not modify the original input.
  it('does not modify the input intervals', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const original = xs.map(([s, e]): Interval => [s, e]);

        mergeIntervals(xs);

        expect(xs).toEqual(original);
      }),
    );
  });

});
