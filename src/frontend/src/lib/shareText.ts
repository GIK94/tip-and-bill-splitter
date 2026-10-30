import { CalculationResult, formatBasisPoints, formatCents } from '@shared/calc';

export const methodLabel = (method: CalculationResult['method']) => (method === 'even' ? 'Even split' : 'Itemised split');

export const tipLabel = (result: CalculationResult) =>
  result.tip.type === 'percent' ? `Tip (${formatBasisPoints(result.tip.basisPoints)})` : 'Tip (fixed)';

/** Plain-text result used for WhatsApp and Copy text. */
export function buildShareText(result: CalculationResult, title?: string | null): string {
  const lines = [`Tip & Bill Split — ${methodLabel(result.method)}`];
  if (title) lines.push(title);
  lines.push(
    `Bill: ${formatCents(result.billCents)} · ${tipLabel(result)}: ${formatCents(result.tipCents)} · Total: ${formatCents(result.totalCents)}`,
  );
  for (const share of result.shares) lines.push(`${share.name}: ${formatCents(share.totalCents)}`);
  return lines.join('\n');
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** e.g. bill-split-2026-10-29 (local date). */
export function exportFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `bill-split-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
