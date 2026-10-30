import { CalculatorOutlined, CopyOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import { Alert, App, Button, Empty, List, Modal, Result, Skeleton, Space, Spin, Typography } from 'antd';
import { CalculationInput, formatCents } from '@shared/calc';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalculatorModal } from '../components/CalculatorModal';
import { ResultView } from '../components/ResultView';
import { ShareActions } from '../components/ShareActions';
import { api, ApiError, SavedCalculation, SavedCalculationSummary } from '../lib/api';
import { formatTime, groupByDay } from '../lib/dates';
import { methodLabel } from '../lib/shareText';

type CalculatorState = { open: false } | { open: true; initialInput?: CalculationInput };

export function HistoryPage() {
  const { modal, message } = App.useApp();
  const [items, setItems] = useState<SavedCalculationSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calculator, setCalculator] = useState<CalculatorState>({ open: false });

  const load = useCallback(() => {
    setLoadError(null);
    api
      .listCalculations()
      .then(setItems)
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 401)) {
          setLoadError(err instanceof ApiError ? err.messages.join(' ') : 'Could not load your history.');
        }
      });
  }, []);

  useEffect(load, [load]);

  const groups = useMemo(() => groupByDay(items ?? []), [items]);

  const confirmDelete = (item: SavedCalculationSummary) => {
    const name = item.title || methodLabel(item.method);
    modal.confirm({
      title: 'Delete this calculation?',
      content: `“${name}” (${formatCents(item.totalCents)}) will be permanently removed from your history. This can't be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.deleteCalculation(item.id);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) return; // session expired; handled globally
          // 404 means it's already gone, so the list should drop it too.
          if (!(err instanceof ApiError && err.status === 404)) {
            message.error('Could not delete. Please try again.');
            return;
          }
        }
        setItems((list) => list && list.filter((c) => c.id !== item.id));
        message.success('Calculation deleted.');
      },
    });
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Space align="center" size={16} wrap className="page-hero__inner">
            <div>
              <Typography.Title className="page-hero__title">
                <HistoryOutlined /> Your saved splits
              </Typography.Title>
              <Typography.Paragraph className="page-hero__lead">
                Every result you've saved, newest first. Open one to see the details, share it, or edit a copy.
              </Typography.Paragraph>
            </div>
            <Button size="large" icon={<CalculatorOutlined />} onClick={() => setCalculator({ open: true })}>
              New split
            </Button>
          </Space>
        </div>
      </section>

      <section className="section">
        <div className="container container--narrow">
          {loadError && (
            <Alert
              type="error"
              showIcon
              message={loadError}
              action={<Button onClick={load}>Retry</Button>}
              style={{ marginBottom: 24 }}
            />
          )}
          {items === null && !loadError && <Skeleton active paragraph={{ rows: 6 }} />}
          {items !== null && items.length === 0 && (
            <Empty description="No saved calculations yet">
              <Button type="primary" icon={<CalculatorOutlined />} onClick={() => setCalculator({ open: true })}>
                Start a new split
              </Button>
            </Empty>
          )}
          {groups.map((group) => (
            <div key={group.key} className="history-group">
              <Typography.Title level={5} className="history-group__label">
                {group.label}
              </Typography.Title>
              <List
                bordered
                className="history-list"
                dataSource={group.items}
                renderItem={(item) => (
                  <List.Item
                    className="history-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(item.id);
                      }
                    }}
                    extra={
                      <Space size={4}>
                        <span className="history-item__total">{formatCents(item.totalCents)}</span>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={`Delete ${item.title || methodLabel(item.method)}`}
                          title="Delete"
                          // Keep clicks/keys on the button from also opening the details.
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(item);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </Space>
                    }
                  >
                    <List.Item.Meta
                      title={item.title || methodLabel(item.method)}
                      description={`${methodLabel(item.method)} · ${item.peopleCount} ${item.peopleCount === 1 ? 'person' : 'people'} · ${formatTime(item.createdAt)}`}
                    />
                  </List.Item>
                )}
              />
            </div>
          ))}
        </div>
      </section>

      <CalculationDetailModal
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onEditCopy={(input) => {
          setSelectedId(null);
          setCalculator({ open: true, initialInput: input });
        }}
      />

      <CalculatorModal
        open={calculator.open}
        method={calculator.open && calculator.initialInput ? calculator.initialInput.method : 'even'}
        initialInput={calculator.open ? calculator.initialInput : undefined}
        onClose={() => setCalculator({ open: false })}
        onSaved={load}
      />
    </>
  );
}

interface DetailModalProps {
  id: string | null;
  onClose: () => void;
  onEditCopy: (input: CalculationInput) => void;
}

/** Read-only details of a saved calculation, with Share and Edit a copy. */
function CalculationDetailModal({ id, onClose, onEditCopy }: DetailModalProps) {
  const [calc, setCalc] = useState<SavedCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCalc(null);
    setError(null);
    if (!id) return;
    let cancelled = false;
    api
      .getCalculation(id)
      .then((c) => !cancelled && setCalc(c))
      .catch((err) => !cancelled && setError(err instanceof ApiError && err.status === 404 ? 'This calculation could not be found.' : 'Could not load this calculation.'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <Modal open={id !== null} onCancel={onClose} footer={null} width={720} title="Saved calculation" destroyOnHidden>
      {error && <Result status="warning" title={error} />}
      {!calc && !error && (
        <div className="centered">
          <Spin />
        </div>
      )}
      {calc && (
        <>
          <ResultView ref={cardRef} result={calc.result} input={calc.input} title={calc.title} savedAt={calc.createdAt} />
          <div className="result-actions">
            <Button icon={<CopyOutlined />} onClick={() => onEditCopy(calc.input)}>
              Edit a copy
            </Button>
            <ShareActions result={calc.result} title={calc.title} savedAt={calc.createdAt} captureRef={cardRef} />
          </div>
        </>
      )}
    </Modal>
  );
}
