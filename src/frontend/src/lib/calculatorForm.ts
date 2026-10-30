import {
  basisPointsToInput,
  calculate,
  CalculationInput,
  CalculationResult,
  centsToInput,
  parseMoneyToCents,
  parsePercentToBasisPoints,
  SplitMethod,
  TIP_PRESETS_BASIS_POINTS,
  TipInput,
} from '@shared/calc';

/** Form state keeps what the user typed (strings), converted to cents only on Calculate. */

export type TipMode = 'preset' | 'custom' | 'fixed';

export interface PersonField {
  key: string;
  name: string;
}

export interface ItemField {
  key: string;
  name: string;
  price: string;
  /** Keys of the people sharing this item. */
  assignees: string[];
}

export interface CalculatorFormState {
  method: SplitMethod;
  bill: string;
  tipMode: TipMode;
  presetBasisPoints: number;
  customPercent: string;
  fixedTip: string;
  peopleCount: number | null;
  people: PersonField[];
  items: ItemField[];
}

/** Field path → message, e.g. { bill: '…', 'items.0.price': '…' }. */
export type FieldErrors = Record<string, string>;

export type FormOutcome =
  | { ok: true; input: CalculationInput; result: CalculationResult }
  | { ok: false; errors: FieldErrors };

let keySeq = 0;
export const newKey = () => `k${++keySeq}`;

export const newPerson = (index: number): PersonField => ({ key: newKey(), name: `Person ${index + 1}` });
export const newItem = (): ItemField => ({ key: newKey(), name: '', price: '', assignees: [] });

export function initialFormState(method: SplitMethod): CalculatorFormState {
  return {
    method,
    bill: '',
    tipMode: 'preset',
    presetBasisPoints: 1500,
    customPercent: '',
    fixedTip: '',
    peopleCount: 2,
    people: [newPerson(0), newPerson(1)],
    items: [newItem()],
  };
}

/** Pre-fills the form from a saved calculation ("Edit a copy"). */
export function formStateFromInput(input: CalculationInput): CalculatorFormState {
  const state = initialFormState(input.method);
  state.bill = centsToInput(input.billCents);
  if (input.tip.type === 'fixed') {
    state.tipMode = 'fixed';
    state.fixedTip = centsToInput(input.tip.cents);
  } else if ((TIP_PRESETS_BASIS_POINTS as readonly number[]).includes(input.tip.basisPoints)) {
    state.presetBasisPoints = input.tip.basisPoints;
  } else {
    state.tipMode = 'custom';
    state.customPercent = basisPointsToInput(input.tip.basisPoints);
  }
  if (input.method === 'even') {
    state.peopleCount = input.peopleCount;
  } else {
    state.people = input.people.map((name) => ({ key: newKey(), name }));
    state.items = input.items.map((item) => ({
      key: newKey(),
      name: item.name,
      price: centsToInput(item.priceCents),
      assignees: item.assignees.map((i) => state.people[i].key),
    }));
  }
  return state;
}

/** Validates the form and runs the shared calculation engine. */
export function runCalculation(state: CalculatorFormState): FormOutcome {
  const parseErrors: FieldErrors = {};

  const billCents = parseMoneyToCents(state.bill);
  if (billCents === null) {
    parseErrors.bill = state.bill.trim() ? 'Enter an amount like 54.00.' : 'Enter the bill amount.';
  }

  let tip: TipInput;
  if (state.tipMode === 'preset') {
    tip = { type: 'percent', basisPoints: state.presetBasisPoints };
  } else if (state.tipMode === 'custom') {
    const bp = parsePercentToBasisPoints(state.customPercent);
    if (bp === null) parseErrors.tip = 'Enter a percentage like 12.5.';
    tip = { type: 'percent', basisPoints: bp ?? NaN };
  } else {
    const cents = parseMoneyToCents(state.fixedTip);
    if (cents === null) parseErrors.tip = 'Enter a tip amount like 10.00.';
    tip = { type: 'fixed', cents: cents ?? NaN };
  }

  let input: CalculationInput;
  if (state.method === 'even') {
    input = { method: 'even', billCents: billCents ?? NaN, tip, peopleCount: state.peopleCount ?? NaN };
  } else {
    const indexByKey = new Map(state.people.map((p, i) => [p.key, i]));
    input = {
      method: 'itemised',
      billCents: billCents ?? NaN,
      tip,
      people: state.people.map((p) => p.name),
      items: state.items.map((item, i) => {
        const priceCents = parseMoneyToCents(item.price);
        if (priceCents === null) {
          parseErrors[`items.${i}.price`] = item.price.trim() ? 'Enter a price like 12.50.' : 'Enter a price.';
        }
        return {
          name: item.name.trim() || `Item ${i + 1}`,
          priceCents: priceCents ?? NaN,
          assignees: item.assignees.map((k) => indexByKey.get(k)).filter((i): i is number => i !== undefined),
        };
      }),
    };
  }

  const outcome = calculate(input);
  if (outcome.ok && Object.keys(parseErrors).length === 0) return outcome;

  // Format problems are explained more precisely than range problems, so they win.
  const errors: FieldErrors = {};
  if (!outcome.ok) for (const e of outcome.errors) errors[e.field] ??= e.message;
  return { ok: false, errors: { ...errors, ...parseErrors } };
}
