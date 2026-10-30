import type { CalculationInput } from '@shared/calc';
import { formStateFromInput, initialFormState, runCalculation } from './calculatorForm';
import { groupByDay } from './dates';
import { buildShareText, exportFileName, whatsappUrl } from './shareText';

describe('runCalculation (form → engine)', () => {
  it('calculates an even split from typed values', () => {
    const state = { ...initialFormState('even'), bill: '$100', presetBasisPoints: 1800, peopleCount: 3 };
    const res = runCalculation(state);
    expect(res.ok && res.result.shares.map((s) => s.totalCents)).toEqual([3934, 3933, 3933]);
  });

  it('reports format errors per field', () => {
    const res = runCalculation({ ...initialFormState('even'), bill: '12.345', tipMode: 'custom', customPercent: 'abc', peopleCount: null });
    expect(res.ok).toBe(false);
    expect(!res.ok && res.errors).toEqual({
      bill: 'Enter an amount like 54.00.',
      tip: 'Enter a percentage like 12.5.',
      peopleCount: 'Number of people must be between 1 and 50.',
    });
  });

  it('asks for a missing bill', () => {
    const res = runCalculation(initialFormState('even'));
    expect(!res.ok && res.errors.bill).toBe('Enter the bill amount.');
  });

  it('maps itemised assignees by person and defaults blank item names', () => {
    const base = initialFormState('itemised');
    const [p1, p2] = base.people;
    const state = {
      ...base,
      bill: '30',
      tipMode: 'fixed' as const,
      fixedTip: '0',
      items: [
        { key: 'a', name: '', price: '20', assignees: [p1.key] },
        { key: 'b', name: 'Shared', price: '10', assignees: [p1.key, p2.key] },
      ],
    };
    const res = runCalculation(state);
    if (!res.ok) throw new Error(JSON.stringify(res.errors));
    expect(res.input).toMatchObject({ items: [{ name: 'Item 1', assignees: [0] }, { name: 'Shared', assignees: [0, 1] }] });
    expect(res.result.shares.map((s) => s.totalCents)).toEqual([2500, 500]);
  });

  it('blocks an unassigned item with a field error', () => {
    const state = { ...initialFormState('itemised'), bill: '30', items: [{ key: 'a', name: 'Pizza', price: '20', assignees: [] }] };
    const res = runCalculation(state);
    expect(!res.ok && res.errors).toEqual({ 'items.0.assignees': 'Assign this item to at least one person.' });
  });

  it('round-trips a saved input through the form ("Edit a copy")', () => {
    const inputs: CalculationInput[] = [
      { method: 'even', billCents: 12345, tip: { type: 'percent', basisPoints: 1250 }, peopleCount: 4 },
      { method: 'even', billCents: 5000, tip: { type: 'percent', basisPoints: 1800 }, peopleCount: 2 },
      {
        method: 'itemised',
        billCents: 5400,
        tip: { type: 'fixed', cents: 1000 },
        people: ['Alice', 'Bob'],
        items: [{ name: 'Pasta', priceCents: 2000, assignees: [0, 1] }],
      },
    ];
    for (const input of inputs) {
      const res = runCalculation(formStateFromInput(input));
      expect(res.ok && res.input).toEqual(input);
    }
    expect(formStateFromInput(inputs[0]).tipMode).toBe('custom');
    expect(formStateFromInput(inputs[1]).tipMode).toBe('preset');
  });
});

describe('share text', () => {
  const res = runCalculation({ ...initialFormState('even'), bill: '100', presetBasisPoints: 1800, peopleCount: 3 });
  if (!res.ok) throw new Error('setup failed');

  it('formats the result for WhatsApp / Copy text', () => {
    expect(buildShareText(res.result, 'Friday dinner')).toBe(
      [
        'Tip & Bill Split — Even split',
        'Friday dinner',
        'Bill: $100.00 · Tip (18%): $18.00 · Total: $118.00',
        'Person 1: $39.34',
        'Person 2: $39.33',
        'Person 3: $39.33',
      ].join('\n'),
    );
  });

  it('builds an encoded wa.me link and dated file names', () => {
    expect(whatsappUrl('a & b\nc')).toBe('https://wa.me/?text=a%20%26%20b%0Ac');
    expect(exportFileName(new Date(2026, 9, 9))).toBe('bill-split-2026-10-09');
  });
});

describe('groupByDay', () => {
  it('groups newest first with Today / Yesterday labels', () => {
    const now = new Date(2026, 9, 29, 12, 0);
    const at = (d: number, h: number) => new Date(2026, 9, d, h).toISOString();
    const groups = groupByDay(
      [
        { id: 1, createdAt: at(27, 9) },
        { id: 2, createdAt: at(29, 8) },
        { id: 3, createdAt: at(28, 20) },
        { id: 4, createdAt: at(29, 11) },
      ],
      now,
    );
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ['Today', [4, 2]],
      ['Yesterday', [3]],
      ['Tue, Oct 27, 2026', [1]],
    ]);
  });
});
