import { SaveOutlined } from '@ant-design/icons';
import { App, Button, Input, Modal, Typography } from 'antd';
import { CalculationInput, LIMITS } from '@shared/calc';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAuthModal } from '../auth/AuthModal';
import { api, ApiError, SavedCalculation } from '../lib/api';

interface SaveActionProps {
  input: CalculationInput;
  /** Called after a successful save; the calculator closes itself in response. */
  onSaved: (saved: SavedCalculation) => void;
}

/**
 * Manual save for logged-in users. Guests get links that open Login / Sign Up in a modal on
 * top of the calculator, so the result is still here to save once they're logged in.
 */
export function SaveAction({ input, onSaved }: SaveActionProps) {
  const { user } = useAuth();
  const { openAuth } = useAuthModal();
  const { message } = App.useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <Typography.Text type="secondary" className="save-hint">
        <Button type="link" className="inline-link" onClick={() => openAuth('login')}>
          Log in
        </Button>{' '}
        or{' '}
        <Button type="link" className="inline-link" onClick={() => openAuth('signup')}>
          sign up
        </Button>{' '}
        to save this result.
      </Typography.Text>
    );
  }

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await api.saveCalculation({ title: title.trim() || undefined, input });
      setDialogOpen(false);
      message.success('Saved to your history.');
      onSaved(result);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        message.error(err instanceof ApiError ? err.messages.join(' ') : 'Could not save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="primary" icon={<SaveOutlined />} onClick={() => setDialogOpen(true)}>
        Save
      </Button>
      <Modal
        open={dialogOpen}
        title="Save this result"
        okText="Save"
        onOk={save}
        confirmLoading={saving}
        onCancel={() => setDialogOpen(false)}
      >
        <label htmlFor="save-title" className="field-label">
          Title (optional)
        </label>
        <Input
          id="save-title"
          placeholder="e.g. Friday dinner"
          maxLength={LIMITS.titleMax}
          showCount
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onPressEnter={save}
          autoFocus
        />
      </Modal>
    </>
  );
}
