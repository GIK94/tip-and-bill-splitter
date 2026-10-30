import { CalculationResult, formatCents } from '@shared/calc';
import { exportFileName, methodLabel, tipLabel } from './shareText';

function download(href: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Downloads a PNG snapshot of the given element (the result card). */
export async function downloadImage(element: HTMLElement): Promise<void> {
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true });
  download(dataUrl, `${exportFileName()}.png`);
}

/**
 * Downloads a text-based PDF of the result. The built-in PDF fonts only cover Latin
 * characters, so plain ASCII punctuation is used.
 */
export async function downloadPdf(result: CalculationResult, title?: string | null, savedAt?: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 48;
  const right = doc.internal.pageSize.getWidth() - 48;
  const bottom = doc.internal.pageSize.getHeight() - 48;
  let y = 64;
  const ensureSpace = (needed: number) => {
    if (y + needed > bottom) {
      doc.addPage();
      y = 64;
    }
  };

  doc.setFont('helvetica', 'bold').setFontSize(18).text(`Tip & Bill Split - ${methodLabel(result.method)}`, left, y);
  y += 22;
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(90);
  if (title) {
    doc.text(title, left, y);
    y += 16;
  }
  doc.text(savedAt ? `Saved ${new Date(savedAt).toLocaleString('en-US')}` : `Created ${new Date().toLocaleString('en-US')}`, left, y);
  y += 28;

  doc.setTextColor(20).setFontSize(12);
  const summary: [string, string][] = [['Bill (incl. tax)', formatCents(result.billCents)]];
  if (result.itemsTotalCents !== null && result.adjustmentCents !== null) {
    summary.push(['Items total', formatCents(result.itemsTotalCents)]);
    summary.push([result.adjustmentCents < 0 ? 'Discount' : 'Tax & fees', formatCents(result.adjustmentCents)]);
  }
  summary.push([tipLabel(result), formatCents(result.tipCents)]);
  summary.push(['Grand total', formatCents(result.totalCents)]);
  for (const [label, value] of summary) {
    if (label === 'Grand total') doc.setFont('helvetica', 'bold');
    doc.text(label, left, y);
    doc.text(value, right, y, { align: 'right' });
    y += 18;
  }
  y += 14;

  const cols = [left, right - 220, right - 110, right];
  const row = (cells: string[], bold = false) => {
    ensureSpace(20);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(cells[0], cols[0], y, { maxWidth: cols[1] - cols[0] - 70 });
    doc.text(cells[1], cols[1], y, { align: 'right' });
    doc.text(cells[2], cols[2], y, { align: 'right' });
    doc.text(cells[3], cols[3], y, { align: 'right' });
    y += 20;
  };
  row(['Person', 'Bill share', 'Tip share', 'Total'], true);
  doc.setDrawColor(200).line(left, y - 14, right, y - 14);
  for (const s of result.shares) row([s.name, formatCents(s.billCents), formatCents(s.tipCents), formatCents(s.totalCents)]);
  doc.line(left, y - 14, right, y - 14);
  row(['Total', formatCents(result.billCents), formatCents(result.tipCents), formatCents(result.totalCents)], true);

  if (result.warnings.length) {
    y += 10;
    doc.setFont('helvetica', 'bold');
    ensureSpace(20);
    doc.text('Notes', left, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    for (const w of result.warnings) {
      ensureSpace(18);
      doc.text(`- ${w.message}`, left, y, { maxWidth: right - left });
      y += 18;
    }
  }

  y += 16;
  ensureSpace(30);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110);
  doc.text('Shares are rounded to the cent; leftover cents are spread fairly so everything adds up exactly.', left, y, {
    maxWidth: right - left,
  });

  doc.save(`${exportFileName()}.pdf`);
}
