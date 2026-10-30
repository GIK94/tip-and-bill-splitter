import { CalculatorOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Form, Input, InputNumber, Modal, Radio, Segmented, Select, Space, Typography } from 'antd';
import { CalculationInput, CalculationResult, formatBasisPoints, LIMITS, SplitMethod, TIP_PRESETS_BASIS_POINTS } from '@shared/calc';
import { useEffect, useRef, useState } from 'react';
import { SavedCalculation } from '../lib/api';
import {
  CalculatorFormState,
  FieldErrors,
  formStateFromInput,
  initialFormState,
  ItemField,
  newItem,
  newPerson,
  runCalculation,
} from '../lib/calculatorForm';
import { ResultView } from './ResultView';
import { SaveAction } from './SaveAction';
import { ShareActions } from './ShareActions';

interface CalculatorModalProps {
  open: boolean;
  method: SplitMethod;
  /** Pre-fills the form ("Edit a copy" from History). */
  initialInput?: CalculationInput;
  onClose: () => void;
  onSaved?: (saved: SavedCalculation) => void;
}

export function CalculatorModal({ open, method, initialInput, onClose, onSaved }: CalculatorModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      maskClosable={false}
      destroyOnHidden
      title={
        <Space>
          <CalculatorOutlined />
          {initialInput ? 'Edit a copy' : 'Split the bill'}
        </Space>
      }
    >
      {/* After a save the modal closes; SaveAction shows the "Saved" confirmation. */}
      <CalculatorForm
        method={method}
        initialInput={initialInput}
        onSaved={(saved) => {
          onSaved?.(saved);
          onClose();
        }}
      />
    </Modal>
  );
}

const fieldStatus = (errors: FieldErrors, field: string) =>
  errors[field] ? { validateStatus: 'error' as const, help: errors[field] } : {};

interface CalculatorFormProps {
  method: SplitMethod;
  initialInput?: CalculationInput;
  onSaved: (saved: SavedCalculation) => void;
}

export function CalculatorForm({ method, initialInput, onSaved }: CalculatorFormProps) {
  const [state, setState] = useState<CalculatorFormState>(() =>
    initialInput ? formStateFromInput(initialInput) : initialFormState(method),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [outcome, setOutcome] = useState<{ input: CalculationInput; result: CalculationResult } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outcome) resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [outcome]);

  /**
   * Every edit clears the result, so a shown/saved/shared result always matches the inputs.
   * `clear` removes errors for the edited field (or every field under a prefix).
   */
  const update = (patch: Partial<CalculatorFormState>, clear: string[] = []) => {
    setState((s) => ({ ...s, ...patch }));
    setOutcome(null);
    if (clear.length) {
      setErrors((errs) =>
        Object.fromEntries(Object.entries(errs).filter(([k]) => !clear.some((c) => k === c || k.startsWith(`${c}.`)))),
      );
    }
  };

  const calculateNow = () => {
    const res = runCalculation(state);
    if (res.ok) {
      setErrors({});
      setOutcome({ input: res.input, result: res.result });
    } else {
      setErrors(res.errors);
      setOutcome(null);
    }
  };

  const updateItem = (index: number, patch: Partial<ItemField>, field: string) =>
    update({ items: state.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }, [`items.${index}.${field}`, 'items']);

  const tipValue = state.tipMode === 'preset' ? `p${state.presetBasisPoints}` : state.tipMode;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <Form layout="vertical" onFinish={calculateNow} requiredMark={false} className="calculator-form">
        <Form.Item label="Split method">
          <Segmented<SplitMethod>
            block
            size="large"
            value={state.method}
            onChange={(value) => update({ method: value }, ['peopleCount', 'people', 'items'])}
            options={[
              { label: 'Even split', value: 'even' },
              { label: 'Itemised', value: 'itemised' },
            ]}
          />
        </Form.Item>

        <Form.Item label="Bill amount (incl. tax)" htmlFor="bill" {...fieldStatus(errors, 'bill')}>
          <Input
            id="bill"
            size="large"
            prefix="$"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={state.bill}
            onChange={(e) => update({ bill: e.target.value }, ['bill'])}
          />
        </Form.Item>

        <Form.Item label="Tip" {...fieldStatus(errors, 'tip')}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            size="large"
            className="tip-options"
            aria-label="Tip"
            value={tipValue}
            onChange={(e) => {
              const v: string = e.target.value;
              if (v.startsWith('p')) update({ tipMode: 'preset', presetBasisPoints: Number(v.slice(1)) }, ['tip']);
              else update({ tipMode: v as 'custom' | 'fixed' }, ['tip']);
            }}
            options={[
              ...TIP_PRESETS_BASIS_POINTS.map((bp) => ({ label: formatBasisPoints(bp), value: `p${bp}` })),
              { label: 'Custom %', value: 'custom' },
              { label: 'Fixed $', value: 'fixed' },
            ]}
          />
          {state.tipMode === 'custom' && (
            <Input
              aria-label="Custom tip percentage"
              size="large"
              suffix="%"
              inputMode="decimal"
              placeholder="e.g. 12.5"
              style={{ marginTop: 12, maxWidth: 220 }}
              value={state.customPercent}
              onChange={(e) => update({ customPercent: e.target.value }, ['tip'])}
            />
          )}
          {state.tipMode === 'fixed' && (
            <Input
              aria-label="Fixed tip amount"
              size="large"
              prefix="$"
              inputMode="decimal"
              placeholder="0.00"
              style={{ marginTop: 12, maxWidth: 220 }}
              value={state.fixedTip}
              onChange={(e) => update({ fixedTip: e.target.value }, ['tip'])}
            />
          )}
        </Form.Item>

        {state.method === 'even' ? (
          <Form.Item label="Number of people" htmlFor="peopleCount" {...fieldStatus(errors, 'peopleCount')}>
            <InputNumber
              id="peopleCount"
              size="large"
              min={1}
              max={LIMITS.maxPeople}
              precision={0}
              inputMode="numeric"
              style={{ width: 160 }}
              value={state.peopleCount}
              onChange={(value) => update({ peopleCount: value }, ['peopleCount'])}
            />
          </Form.Item>
        ) : (
          <>
            <Typography.Title level={5}>People</Typography.Title>
            {errors.people && <Alert type="error" showIcon message={errors.people} style={{ marginBottom: 12 }} />}
            {state.people.map((person, i) => (
              <Form.Item key={person.key} style={{ marginBottom: 8 }} {...fieldStatus(errors, `people.${i}`)}>
                <Space.Compact block>
                  <Input
                    aria-label={`Name of person ${i + 1}`}
                    size="large"
                    maxLength={LIMITS.personNameMax}
                    value={person.name}
                    onChange={(e) =>
                      update(
                        { people: state.people.map((p) => (p.key === person.key ? { ...p, name: e.target.value } : p)) },
                        [`people.${i}`, 'people'],
                      )
                    }
                  />
                  <Button
                    size="large"
                    icon={<DeleteOutlined />}
                    aria-label={`Remove ${person.name || `person ${i + 1}`}`}
                    disabled={state.people.length <= 1}
                    onClick={() =>
                      update(
                        {
                          people: state.people.filter((p) => p.key !== person.key),
                          items: state.items.map((item) => ({ ...item, assignees: item.assignees.filter((k) => k !== person.key) })),
                        },
                        ['people', 'items'],
                      )
                    }
                  />
                </Space.Compact>
              </Form.Item>
            ))}
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              disabled={state.people.length >= LIMITS.maxPeople}
              onClick={() => update({ people: [...state.people, newPerson(state.people.length)] }, ['people'])}
              style={{ marginBottom: 24 }}
            >
              Add person
            </Button>

            <Typography.Title level={5}>Items</Typography.Title>
            {errors.items && <Alert type="error" showIcon message={errors.items} style={{ marginBottom: 12 }} />}
            {state.items.map((item, i) => (
              <Card key={item.key} size="small" className="item-card">
                <div className="item-card__row">
                  <Form.Item className="item-card__name" style={{ marginBottom: 8 }} {...fieldStatus(errors, `items.${i}.name`)}>
                    <Input
                      aria-label={`Item ${i + 1} name`}
                      size="large"
                      placeholder={`Item ${i + 1}`}
                      maxLength={LIMITS.itemNameMax}
                      value={item.name}
                      onChange={(e) => updateItem(i, { name: e.target.value }, 'name')}
                    />
                  </Form.Item>
                  <Form.Item className="item-card__price" style={{ marginBottom: 8 }} {...fieldStatus(errors, `items.${i}.price`)}>
                    <Input
                      aria-label={`Item ${i + 1} price`}
                      size="large"
                      prefix="$"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={item.price}
                      onChange={(e) => updateItem(i, { price: e.target.value }, 'price')}
                    />
                  </Form.Item>
                  <Button
                    size="large"
                    icon={<DeleteOutlined />}
                    aria-label={`Remove item ${i + 1}`}
                    disabled={state.items.length <= 1}
                    onClick={() => update({ items: state.items.filter((it) => it.key !== item.key) }, ['items'])}
                  />
                </div>
                <Form.Item style={{ marginBottom: 0 }} {...fieldStatus(errors, `items.${i}.assignees`)}>
                  <Space.Compact block>
                    <Select
                      mode="multiple"
                      size="large"
                      aria-label={`Who shared item ${i + 1}`}
                      placeholder="Who shared this?"
                      style={{ width: '100%' }}
                      value={item.assignees}
                      onChange={(keys: string[]) => updateItem(i, { assignees: keys }, 'assignees')}
                      options={state.people.map((p, pi) => ({ value: p.key, label: p.name.trim() || `Person ${pi + 1}` }))}
                      optionFilterProp="label"
                    />
                    <Button size="large" onClick={() => updateItem(i, { assignees: state.people.map((p) => p.key) }, 'assignees')}>
                      Everyone
                    </Button>
                  </Space.Compact>
                </Form.Item>
              </Card>
            ))}
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              disabled={state.items.length >= LIMITS.maxItems}
              onClick={() => update({ items: [...state.items, newItem()] }, ['items'])}
              style={{ marginBottom: 24 }}
            >
              Add item
            </Button>
          </>
        )}

        {hasErrors && <Alert type="error" showIcon message="Please fix the highlighted fields." style={{ marginBottom: 16 }} />}
        <Button type="primary" htmlType="submit" size="large" block icon={<CalculatorOutlined />}>
          Calculate
        </Button>
      </Form>

      {outcome && (
        <>
          <Divider />
          <ResultView ref={resultRef} result={outcome.result} input={outcome.input} />
          <div className="result-actions">
            <SaveAction input={outcome.input} onSaved={onSaved} />
            <ShareActions result={outcome.result} captureRef={resultRef} />
          </div>
        </>
      )}
    </>
  );
}
