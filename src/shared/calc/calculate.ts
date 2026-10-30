import { allocateBillAndTip } from './allocate';
import { formatCents } from './money';

export const LIMITS = {
  maxAmountCents: 9_999_999, // $99,999.99
  maxPercentBasisPoints: 10_000, // 100%
  maxPeople: 50,
  maxItems: 100,
  personNameMax: 30,
  itemNameMax: 40,
  titleMax: 60,
} as const;

export const TIP_PRESETS_BASIS_POINTS = [0, 1000, 1500, 1800, 2000] as const;

export type SplitMethod = 'even' | 'itemised';

export type TipInput = { type: 'percent'; basisPoints: number } | { type: 'fixed'; cents: number };

export interface ItemInput {
  name: string;
  priceCents: number;
  /** Indexes into `people`. */
  assignees: number[];
}

export interface EvenInput {
  method: 'even';
  billCents: number;
  tip: TipInput;
  peopleCount: number;
}

export interface ItemisedInput {
  method: 'itemised';
  billCents: number;
  tip: TipInput;
  people: string[];
  items: ItemInput[];
}

export type CalculationInput = EvenInput | ItemisedInput;

export interface PersonShare {
  name: string;
  billCents: number;
  tipCents: number;
  totalCents: number;
}

export type WarningCode = 'TIP_EXCEEDS_BILL' | 'ITEMS_EXCEED_BILL' | 'PERSON_WITHOUT_ITEMS';

export interface CalculationWarning {
  code: WarningCode;
  message: string;
}

export interface CalculationResult {
  method: SplitMethod;
  billCents: number;
  tip: TipInput;
  tipCents: number;
  totalCents: number;
  /** Itemised only: sum of item prices. */
  itemsTotalCents: number | null;
  /** Itemised only: bill − items total (tax & fees if positive, discount if negative). */
  adjustmentCents: number | null;
  shares: PersonShare[];
  warnings: CalculationWarning[];
}

/** `field` uses form paths: "bill", "tip", "peopleCount", "people", "people.2", "items", "items.0.price"… */
export interface ValidationIssue {
  field: string;
  message: string;
}

export type CalculationOutcome =
  | { ok: true; input: CalculationInput; result: CalculationResult }
  | { ok: false; errors: ValidationIssue[] };

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const inRange = (v: unknown, min: number, max: number): v is number => isInt(v) && v >= min && v <= max;

function validateTip(tip: TipInput | undefined, errors: ValidationIssue[]): void {
  if (!tip || (tip.type !== 'percent' && tip.type !== 'fixed')) {
    errors.push({ field: 'tip', message: 'Choose a tip.' });
  } else if (tip.type === 'percent' && !inRange(tip.basisPoints, 0, LIMITS.maxPercentBasisPoints)) {
    errors.push({ field: 'tip', message: 'Tip percentage must be between 0 and 100.' });
  } else if (tip.type === 'fixed' && !inRange(tip.cents, 0, LIMITS.maxAmountCents)) {
    errors.push({ field: 'tip', message: 'Tip amount must be between $0.00 and $99,999.99.' });
  }
}

/** Returns a clean copy with names trimmed and unrelated fields dropped. Assumes valid input. */
function normalize(input: CalculationInput): CalculationInput {
  const tip: TipInput =
    input.tip.type === 'percent'
      ? { type: 'percent', basisPoints: input.tip.basisPoints }
      : { type: 'fixed', cents: input.tip.cents };
  if (input.method === 'even') {
    return { method: 'even', billCents: input.billCents, tip, peopleCount: input.peopleCount };
  }
  return {
    method: 'itemised',
    billCents: input.billCents,
    tip,
    people: input.people.map((p) => p.trim()),
    items: input.items.map((item) => ({
      name: item.name.trim(),
      priceCents: item.priceCents,
      assignees: [...item.assignees],
    })),
  };
}

export function validate(input: CalculationInput): ValidationIssue[] {
  const errors: ValidationIssue[] = [];

  if (!inRange(input.billCents, 1, LIMITS.maxAmountCents)) {
    errors.push({ field: 'bill', message: 'Enter a bill amount between $0.01 and $99,999.99.' });
  }
  validateTip(input.tip, errors);

  if (input.method === 'even') {
    if (!inRange(input.peopleCount, 1, LIMITS.maxPeople)) {
      errors.push({ field: 'peopleCount', message: `Number of people must be between 1 and ${LIMITS.maxPeople}.` });
    }
    return errors;
  }

  if (input.method !== 'itemised') {
    return [{ field: 'method', message: 'Choose Even or Itemised.' }];
  }

  const people = Array.isArray(input.people) ? input.people : [];
  if (people.length < 1 || people.length > LIMITS.maxPeople) {
    errors.push({ field: 'people', message: `Add between 1 and ${LIMITS.maxPeople} people.` });
  }
  const seen = new Map<string, number>();
  people.forEach((raw, i) => {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (name.length < 1 || name.length > LIMITS.personNameMax) {
      errors.push({ field: `people.${i}`, message: `Name must be 1–${LIMITS.personNameMax} characters.` });
      return;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      errors.push({ field: `people.${i}`, message: 'Each person needs a different name.' });
    } else {
      seen.set(key, i);
    }
  });

  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length < 1 || items.length > LIMITS.maxItems) {
    errors.push({ field: 'items', message: `Add between 1 and ${LIMITS.maxItems} items.` });
  }
  let itemsTotal = 0;
  items.forEach((item, i) => {
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (name.length < 1 || name.length > LIMITS.itemNameMax) {
      errors.push({ field: `items.${i}.name`, message: `Item name must be 1–${LIMITS.itemNameMax} characters.` });
    }
    if (!inRange(item.priceCents, 0, LIMITS.maxAmountCents)) {
      errors.push({ field: `items.${i}.price`, message: 'Enter a price between $0.00 and $99,999.99.' });
    } else {
      itemsTotal += item.priceCents;
    }
    const assignees = Array.isArray(item.assignees) ? item.assignees : [];
    if (assignees.length === 0) {
      errors.push({ field: `items.${i}.assignees`, message: 'Assign this item to at least one person.' });
    } else if (
      assignees.some((a) => !inRange(a, 0, people.length - 1)) ||
      new Set(assignees).size !== assignees.length
    ) {
      errors.push({ field: `items.${i}.assignees`, message: 'Item is assigned to an unknown person.' });
    }
  });

  const itemErrors = errors.some((e) => e.field.startsWith('items.'));
  if (items.length > 0 && !itemErrors && itemsTotal === 0) {
    errors.push({ field: 'items', message: 'Add at least one item with a price above $0.00.' });
  }
  return errors;
}

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Exact per-person weights for an itemised bill (shared items split equally). */
function itemisedWeights(input: ItemisedInput): bigint[] {
  // Common denominator so every equal portion of a shared item is a whole number.
  const denom = input.items.reduce((d, item) => {
    const k = BigInt(item.assignees.length);
    return (d * k) / gcd(d, k);
  }, 1n);
  const weights = input.people.map(() => 0n);
  for (const item of input.items) {
    const portion = (BigInt(item.priceCents) * denom) / BigInt(item.assignees.length);
    for (const person of item.assignees) weights[person] += portion;
  }
  return weights;
}

export function calculate(rawInput: CalculationInput): CalculationOutcome {
  const errors = validate(rawInput);
  if (errors.length > 0) return { ok: false, errors };

  const input = normalize(rawInput);
  const { billCents } = input;
  const tipCents =
    input.tip.type === 'percent'
      ? Math.floor((billCents * input.tip.basisPoints + 5_000) / 10_000) // round half up
      : input.tip.cents;
  const warnings: CalculationWarning[] = [];

  if (input.tip.type === 'fixed' && tipCents > billCents) {
    warnings.push({ code: 'TIP_EXCEEDS_BILL', message: 'The tip is larger than the bill.' });
  }

  let names: string[];
  let weights: bigint[];
  let itemsTotalCents: number | null = null;
  let adjustmentCents: number | null = null;

  if (input.method === 'even') {
    names = Array.from({ length: input.peopleCount }, (_, i) => `Person ${i + 1}`);
    weights = names.map(() => 1n);
  } else {
    names = input.people;
    weights = itemisedWeights(input);
    itemsTotalCents = input.items.reduce((s, item) => s + item.priceCents, 0);
    adjustmentCents = billCents - itemsTotalCents;
    if (itemsTotalCents > billCents) {
      warnings.push({
        code: 'ITEMS_EXCEED_BILL',
        message: `Items add up to ${formatCents(itemsTotalCents)}, more than the bill. Shares were scaled down proportionally.`,
      });
    }
    names.forEach((name, i) => {
      if (!input.items.some((item) => item.assignees.includes(i))) {
        warnings.push({ code: 'PERSON_WITHOUT_ITEMS', message: `${name} has no items and pays $0.00.` });
      }
    });
  }

  const shares = allocateBillAndTip(billCents, tipCents, weights).map((a, i) => ({ name: names[i], ...a }));

  return {
    ok: true,
    input,
    result: {
      method: input.method,
      billCents,
      tip: input.tip,
      tipCents,
      totalCents: billCents + tipCents,
      itemsTotalCents,
      adjustmentCents,
      shares,
      warnings,
    },
  };
}
