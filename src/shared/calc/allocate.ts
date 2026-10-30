/**
 * Fair cent allocation (largest-remainder method).
 *
 * Weights are BigInt so that shares stay exact even for items split between many
 * people (e.g. a $10 item shared by 7) — nothing is rounded until the final cent.
 */

export interface Allocation {
  billCents: number;
  tipCents: number;
  totalCents: number;
}

function sum(values: bigint[]): bigint {
  return values.reduce((a, b) => a + b, 0n);
}

/** Order of indices by remainder (largest first); ties go to the first-listed person. */
function byLargestRemainder(remainders: bigint[]): number[] {
  return remainders
    .map((_, i) => i)
    .sort((i, j) => (remainders[j] > remainders[i] ? 1 : remainders[j] < remainders[i] ? -1 : i - j));
}

/**
 * Splits `amount` cents proportionally to `weights`. Each share is rounded down, then the
 * leftover cents go one each to the largest fractional remainders. The result always sums
 * to `amount` and every share is within 1 cent of its exact value.
 */
export function allocate(amount: number, weights: bigint[]): number[] {
  const totalWeight = sum(weights);
  if (totalWeight <= 0n) throw new Error('Weights must add up to more than zero');
  const a = BigInt(amount);
  const shares = weights.map((w) => (a * w) / totalWeight);
  const remainders = weights.map((w) => (a * w) % totalWeight);
  const leftover = Number(a - sum(shares));
  const order = byLargestRemainder(remainders);
  for (let k = 0; k < leftover; k++) shares[order[k]] += 1n;
  return shares.map(Number);
}

/**
 * Splits a bill and tip proportionally to `weights` so that, at the same time:
 * - totals sum to bill + tip, tip shares sum to tip, bill shares sum to bill;
 * - each total, tip share and bill share is within 1 cent of its exact value.
 *
 * Totals are allocated first (largest remainder). Each person's bill share is then
 * chosen within the range that keeps both their bill share and tip share within a cent,
 * again handing spare cents to the largest remainders, ties to the first-listed person.
 */
export function allocateBillAndTip(billCents: number, tipCents: number, weights: bigint[]): Allocation[] {
  const totalWeight = sum(weights);
  const totals = allocate(billCents + tipCents, weights);
  const B = BigInt(billCents);
  const T = BigInt(tipCents);

  const lo: number[] = [];
  const hi: number[] = [];
  const billRemainders: bigint[] = [];
  weights.forEach((w, i) => {
    const bFloor = Number((B * w) / totalWeight);
    const bRem = (B * w) % totalWeight;
    const tFloor = Number((T * w) / totalWeight);
    const tCeil = (T * w) % totalWeight > 0n ? tFloor + 1 : tFloor;
    lo.push(Math.max(bFloor, totals[i] - tCeil));
    hi.push(Math.min(bRem > 0n ? bFloor + 1 : bFloor, totals[i] - tFloor));
    billRemainders.push(bRem);
  });

  const bills = [...lo];
  let needed = billCents - lo.reduce((a, b) => a + b, 0);
  for (const i of byLargestRemainder(billRemainders)) {
    if (needed === 0) break;
    if (hi[i] > bills[i]) {
      bills[i] += 1;
      needed -= 1;
    }
  }
  if (needed !== 0) throw new Error('Could not allocate bill shares exactly');

  return totals.map((total, i) => ({ billCents: bills[i], tipCents: total - bills[i], totalCents: total }));
}
