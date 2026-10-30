import { Alert, Collapse, Table, Typography } from 'antd';
import { CalculationInput, CalculationResult, formatCents, PersonShare } from '@shared/calc';
import { forwardRef } from 'react';
import { formatDateTime } from '../lib/dates';
import { methodLabel, tipLabel } from '../lib/shareText';

interface ResultViewProps {
  result: CalculationResult;
  input: CalculationInput;
  title?: string | null;
  savedAt?: string;
}

/** The result card. Its root element is what "Image" exports. */
export const ResultView = forwardRef<HTMLDivElement, ResultViewProps>(function ResultView({ result, input, title, savedAt }, ref) {
  const summary: { label: string; value: string; strong?: boolean }[] = [
    { label: 'Bill (incl. tax)', value: formatCents(result.billCents) },
  ];
  if (result.itemsTotalCents !== null && result.adjustmentCents !== null) {
    summary.push({ label: 'Items total', value: formatCents(result.itemsTotalCents) });
    summary.push({ label: result.adjustmentCents < 0 ? 'Discount' : 'Tax & fees', value: formatCents(result.adjustmentCents) });
  }
  summary.push({ label: tipLabel(result), value: formatCents(result.tipCents) });
  summary.push({ label: 'Grand total', value: formatCents(result.totalCents), strong: true });

  return (
    <div ref={ref} className="result-card" aria-live="polite">
      <div className="result-card__header">
        <Typography.Text type="secondary">{methodLabel(result.method)}</Typography.Text>
        {title && <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>}
        {savedAt && <Typography.Text type="secondary">Saved {formatDateTime(savedAt)}</Typography.Text>}
      </div>

      {result.warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={result.warnings.length === 1 ? result.warnings[0].message : 'Please note'}
          description={
            result.warnings.length > 1 ? (
              <ul className="plain-list">
                {result.warnings.map((w) => (
                  <li key={w.message}>{w.message}</li>
                ))}
              </ul>
            ) : undefined
          }
        />
      )}

      <dl className="result-summary">
        {summary.map((row) => (
          <div key={row.label} className={row.strong ? 'result-summary__row is-total' : 'result-summary__row'}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      <Table<PersonShare>
        size="small"
        pagination={false}
        rowKey="name"
        dataSource={result.shares}
        className="result-table"
        columns={[
          { title: 'Person', dataIndex: 'name', ellipsis: true },
          { title: 'Bill', dataIndex: 'billCents', align: 'right', render: formatCents },
          { title: 'Tip', dataIndex: 'tipCents', align: 'right', render: formatCents },
          { title: 'Pays', dataIndex: 'totalCents', align: 'right', render: (v: number) => <strong>{formatCents(v)}</strong> },
        ]}
        summary={() => (
          <Table.Summary.Row className="result-table__total">
            <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">{formatCents(result.billCents)}</Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">{formatCents(result.tipCents)}</Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">{formatCents(result.totalCents)}</Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      {input.method === 'itemised' && (
        <Collapse
          ghost
          size="small"
          style={{ marginTop: 8 }}
          items={[
            {
              key: 'items',
              label: `Items (${input.items.length})`,
              children: (
                <ul className="plain-list item-list">
                  {input.items.map((item, i) => (
                    <li key={i}>
                      <span>
                        {item.name}
                        <Typography.Text type="secondary"> · {item.assignees.map((p) => input.people[p]).join(', ')}</Typography.Text>
                      </span>
                      <span>{formatCents(item.priceCents)}</span>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      )}

      <Typography.Paragraph type="secondary" className="result-footnote">
        Shares are rounded to the cent. Leftover cents are spread fairly, so everything adds up exactly.
      </Typography.Paragraph>
    </div>
  );
});
