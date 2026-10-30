import {
  allocate,
  calculate,
  CalculationInput,
  CalculationResult,
  formatBasisPoints,
  formatCents,
  ItemisedInput,
  parseMoneyToCents,
  parsePercentToBasisPoints,
} from './index';

function ok(input: CalculationInput): CalculationResult {
  const outcome = calculate(input);
  if (!outcome.ok) throw new Error(`Expected success, got ${JSON.stringify(outcome.errors)}`);
  return outcome.result;
}

function errorFields(input: CalculationInput): string[] {
  const outcome = calculate(input);
  if (outcome.ok) throw new Error('Expected validation errors');
  return outcome.errors.map((e) => e.field);
}

const cents = (r: CalculationResult, key: 'billCents' | 'tipCents' | 'totalCents') => r.shares.map((s) => s[key]);

describe('money parsing and formatting', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['$1,234.56', 123456],
    ['.99', 99],
    ['0', 0],
    [' 7. ', 700],
    ['99999.99', 9999999],
  ])('parses %p as %p cents', (raw, expected) => {
    expect(parseMoneyToCents(raw)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1.234', '12..5', '100000000', '1e3'])('rejects %p', (raw) => {
    expect(parseMoneyToCents(raw)).toBeNull();
  });

  it('parses percentages to basis points', () => {
    expect(parsePercentToBasisPoints('18')).toBe(1800);
    expect(parsePercentToBasisPoints('12.5%')).toBe(1250);
    expect(parsePercentToBasisPoints('0.01')).toBe(1);
    expect(parsePercentToBasisPoints('1.234')).toBeNull();
    expect(parsePercentToBasisPoints('-1')).toBeNull();
  });

  it('formats cents and percentages', () => {
    expect(formatCents(123456)).toBe('$1,234.56');
    expect(formatCents(5)).toBe('$0.05');
    expect(formatCents(-300)).toBe('-$3.00');
    expect(formatBasisPoints(1800)).toBe('18%');
    expect(formatBasisPoints(1250)).toBe('12.5%');
    expect(formatBasisPoints(1275)).toBe('12.75%');
  });
});

describe('allocate (largest remainder)', () => {
  it('gives leftover cents to the largest remainders, ties to the first-listed', () => {
    expect(allocate(100, [1n, 1n, 1n])).toEqual([34, 33, 33]);
    expect(allocate(200, [1n, 1n, 1n])).toEqual([67, 67, 66]);
  });

  it('never gives cents to a zero weight', () => {
    expect(allocate(101, [1n, 0n, 1n])).toEqual([51, 0, 50]);
  });
});

describe('even split', () => {
  it('AC-01: $100.00, 18%, 3 people', () => {
    const r = ok({ method: 'even', billCents: 10000, tip: { type: 'percent', basisPoints: 1800 }, peopleCount: 3 });
    expect(r.tipCents).toBe(1800);
    expect(r.totalCents).toBe(11800);
    expect(cents(r, 'totalCents')).toEqual([3934, 3933, 3933]);
    expect(cents(r, 'tipCents')).toEqual([600, 600, 600]);
    expect(cents(r, 'billCents')).toEqual([3334, 3333, 3333]);
    expect(r.shares.map((s) => s.name)).toEqual(['Person 1', 'Person 2', 'Person 3']);
    expect(r.warnings).toEqual([]);
  });

  it('AC-05: percentage tip rounds half up', () => {
    const r = ok({ method: 'even', billCents: 1005, tip: { type: 'percent', basisPoints: 1500 }, peopleCount: 1 });
    expect(r.tipCents).toBe(151); // $1.5075 -> $1.51
    expect(ok({ method: 'even', billCents: 1010, tip: { type: 'percent', basisPoints: 1500 }, peopleCount: 1 }).tipCents).toBe(152); // 1.515 -> 1.52
  });

  it('one person pays everything', () => {
    const r = ok({ method: 'even', billCents: 4321, tip: { type: 'percent', basisPoints: 2000 }, peopleCount: 1 });
    expect(r.shares).toEqual([{ name: 'Person 1', billCents: 4321, tipCents: 864, totalCents: 5185 }]);
  });

  it('0% tip splits only the bill', () => {
    const r = ok({ method: 'even', billCents: 1000, tip: { type: 'percent', basisPoints: 0 }, peopleCount: 3 });
    expect(cents(r, 'tipCents')).toEqual([0, 0, 0]);
    expect(cents(r, 'totalCents')).toEqual([334, 333, 333]);
  });

  it('warns when a fixed tip exceeds the bill but still calculates', () => {
    const r = ok({ method: 'even', billCents: 1000, tip: { type: 'fixed', cents: 1500 }, peopleCount: 2 });
    expect(r.warnings.map((w) => w.code)).toEqual(['TIP_EXCEEDS_BILL']);
    expect(cents(r, 'totalCents')).toEqual([1250, 1250]);
  });

  it('allows $0.00 shares when the total has fewer cents than people', () => {
    const r = ok({ method: 'even', billCents: 2, tip: { type: 'percent', basisPoints: 0 }, peopleCount: 3 });
    expect(cents(r, 'totalCents')).toEqual([1, 1, 0]);
  });

  it('rejects invalid inputs', () => {
    expect(errorFields({ method: 'even', billCents: 0, tip: { type: 'percent', basisPoints: 1500 }, peopleCount: 2 })).toEqual(['bill']);
    expect(errorFields({ method: 'even', billCents: 10000000, tip: { type: 'percent', basisPoints: 1500 }, peopleCount: 2 })).toEqual(['bill']);
    expect(errorFields({ method: 'even', billCents: 100, tip: { type: 'percent', basisPoints: 10001 }, peopleCount: 2 })).toEqual(['tip']);
    expect(errorFields({ method: 'even', billCents: 100, tip: { type: 'fixed', cents: -1 }, peopleCount: 2 })).toEqual(['tip']);
    expect(errorFields({ method: 'even', billCents: 100, tip: { type: 'percent', basisPoints: 1500 }, peopleCount: 0 })).toEqual(['peopleCount']);
    expect(errorFields({ method: 'even', billCents: 100, tip: { type: 'percent', basisPoints: 1500 }, peopleCount: 51 })).toEqual(['peopleCount']);
    expect(errorFields({ method: 'even', billCents: 10.5, tip: { type: 'percent', basisPoints: 1500 }, peopleCount: 2 })).toEqual(['bill']);
  });
});

describe('itemised split', () => {
  const example: ItemisedInput = {
    method: 'itemised',
    billCents: 5400,
    tip: { type: 'percent', basisPoints: 2000 },
    people: ['Alice', 'Bob', 'Cara'],
    items: [
      { name: 'Pasta', priceCents: 2000, assignees: [0] },
      { name: 'Steak', priceCents: 2500, assignees: [1] },
      { name: 'Fries', priceCents: 600, assignees: [0, 1, 2] },
    ],
  };

  it('AC-02: worked example from the requirements', () => {
    const r = ok(example);
    expect(r.tipCents).toBe(1080);
    expect(r.totalCents).toBe(6480);
    expect(r.itemsTotalCents).toBe(5100);
    expect(r.adjustmentCents).toBe(300);
    expect(r.shares).toEqual([
      { name: 'Alice', billCents: 2329, tipCents: 466, totalCents: 2795 },
      { name: 'Bob', billCents: 2859, tipCents: 572, totalCents: 3431 },
      { name: 'Cara', billCents: 212, tipCents: 42, totalCents: 254 },
    ]);
    expect(r.warnings).toEqual([]);
  });

  it('warns and scales down when items exceed the bill', () => {
    const r = ok({ ...example, billCents: 4000 });
    expect(r.warnings.map((w) => w.code)).toEqual(['ITEMS_EXCEED_BILL']);
    expect(r.adjustmentCents).toBe(-1100);
    expect(cents(r, 'billCents').reduce((a, b) => a + b)).toBe(4000);
  });

  it('warns about a person with no items, who pays $0.00', () => {
    const r = ok({ ...example, people: ['Alice', 'Bob', 'Cara', 'Dan'] });
    expect(r.warnings).toEqual([{ code: 'PERSON_WITHOUT_ITEMS', message: 'Dan has no items and pays $0.00.' }]);
    expect(r.shares[3]).toEqual({ name: 'Dan', billCents: 0, tipCents: 0, totalCents: 0 });
  });

  it('allows $0.00 items', () => {
    const r = ok({ ...example, items: [...example.items, { name: 'Water', priceCents: 0, assignees: [2] }] });
    expect(r.shares).toEqual(ok(example).shares);
  });

  it('splits items shared by many people exactly', () => {
    const r = ok({
      method: 'itemised',
      billCents: 1000,
      tip: { type: 'fixed', cents: 0 },
      people: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      items: [{ name: 'Platter', priceCents: 1000, assignees: [0, 1, 2, 3, 4, 5, 6] }],
    });
    expect(cents(r, 'totalCents')).toEqual([143, 143, 143, 143, 143, 143, 142]);
  });

  it('trims names and treats duplicates case-insensitively', () => {
    expect(errorFields({ ...example, people: ['Alice', ' alice ', 'Cara'] })).toEqual(['people.1']);
    expect(ok({ ...example, people: [' Alice ', 'Bob', 'Cara'] }).shares[0].name).toBe('Alice');
  });

  it('blocks unassigned items, zero totals and invalid entries', () => {
    expect(errorFields({ ...example, items: [{ name: 'Pasta', priceCents: 2000, assignees: [] }] })).toEqual(['items.0.assignees']);
    expect(errorFields({ ...example, items: [{ name: 'Water', priceCents: 0, assignees: [0] }] })).toEqual(['items']);
    expect(errorFields({ ...example, items: [] })).toEqual(['items']);
    expect(errorFields({ ...example, people: [] })).toEqual(expect.arrayContaining(['people', 'items.0.assignees']));
    expect(errorFields({ ...example, people: ['Alice', '', 'Cara'] })).toEqual(['people.1']);
    expect(errorFields({ ...example, items: [{ name: 'Pasta', priceCents: 2000, assignees: [5] }] })).toEqual(['items.0.assignees']);
    expect(errorFields({ ...example, items: [{ name: 'Pasta', priceCents: 2000, assignees: [0, 0] }] })).toEqual(['items.0.assignees']);
    expect(errorFields({ ...example, items: [{ name: ' ', priceCents: 2000, assignees: [0] }] })).toEqual(['items.0.name']);
    expect(errorFields({ ...example, items: [{ name: 'Pasta', priceCents: -1, assignees: [0] }] })).toEqual(['items.0.price']);
  });

  it('drops unrelated fields from the normalised input', () => {
    const outcome = calculate({ ...example, peopleCount: 9, tip: { type: 'percent', basisPoints: 2000, cents: 5 } } as never);
    expect(outcome.ok && outcome.input).toEqual(example);
  });
});

describe('AC-03: invariants hold for random inputs', () => {
  // Deterministic pseudo-random generator so failures are reproducible.
  let seed = 42;
  const rand = (max: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % max;
  };

  function checkInvariants(input: CalculationInput) {
    const r = ok(input);
    const sumOf = (key: 'billCents' | 'tipCents' | 'totalCents') => r.shares.reduce((s, x) => s + x[key], 0);
    expect(sumOf('billCents')).toBe(r.billCents);
    expect(sumOf('tipCents')).toBe(r.tipCents);
    expect(sumOf('totalCents')).toBe(r.totalCents);

    // Exact shares as fractions: amount * weight / totalWeight.
    let weights: number[];
    if (input.method === 'even') {
      weights = r.shares.map(() => 1);
    } else {
      const denom = 2520; // lcm(1..10): exact for up to 10 assignees per item
      weights = input.people.map(() => 0);
      input.items.forEach((item) => item.assignees.forEach((p) => (weights[p] += (item.priceCents * denom) / item.assignees.length)));
    }
    const W = BigInt(weights.reduce((a, b) => a + b, 0));
    const violations: string[] = [];
    r.shares.forEach((s, i) => {
      const w = BigInt(weights[i]);
      for (const [share, amount] of [
        [s.billCents, r.billCents],
        [s.tipCents, r.tipCents],
        [s.totalCents, r.totalCents],
      ]) {
        const diff = BigInt(share) * W - BigInt(amount) * w; // (share − exact) × W
        if (share < 0 || diff >= W || diff <= -W) violations.push(`${s.name}: ${share} of ${amount}`);
      }
    });
    if (violations.length) throw new Error(`${JSON.stringify(input)} -> ${violations.join(', ')}`);
  }

  it('even split', () => {
    for (let n = 0; n < 3000; n++) {
      const tip = rand(2) ? { type: 'percent' as const, basisPoints: rand(10001) } : { type: 'fixed' as const, cents: rand(20000) };
      checkInvariants({ method: 'even', billCents: 1 + rand(rand(2) ? 100 : 9999999), tip, peopleCount: 1 + rand(50) });
    }
  });

  it('itemised split', () => {
    for (let n = 0; n < 3000; n++) {
      const peopleCount = 1 + rand(10);
      const people = Array.from({ length: peopleCount }, (_, i) => `P${i}`);
      const items = Array.from({ length: 1 + rand(8) }, (_, j) => {
        const assignees = people.map((_, i) => i).filter(() => rand(3) === 0);
        return { name: `I${j}`, priceCents: 1 + rand(5000), assignees: assignees.length ? assignees : [rand(peopleCount)] };
      });
      const tip = rand(2) ? { type: 'percent' as const, basisPoints: rand(3001) } : { type: 'fixed' as const, cents: rand(3000) };
      checkInvariants({ method: 'itemised', billCents: 1 + rand(rand(4) ? 30000 : 50), tip, people, items });
    }
  });
});
