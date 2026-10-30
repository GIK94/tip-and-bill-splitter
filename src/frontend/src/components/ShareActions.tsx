import { CopyOutlined, FilePdfOutlined, PictureOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Modal, Space } from 'antd';
import { CalculationResult } from '@shared/calc';
import { RefObject, useState } from 'react';
import { downloadImage, downloadPdf } from '../lib/exportFiles';
import { buildShareText, whatsappUrl } from '../lib/shareText';

interface ShareActionsProps {
  result: CalculationResult;
  title?: string | null;
  savedAt?: string;
  /** The result card element, exported by "Image". */
  captureRef: RefObject<HTMLElement>;
}

type TextDialog = null | 'whatsapp-failed' | 'manual-copy';

export function ShareActions({ result, title, savedAt, captureRef }: ShareActionsProps) {
  const { message } = App.useApp();
  const [dialog, setDialog] = useState<TextDialog>(null);
  const [busy, setBusy] = useState<null | 'image' | 'pdf'>(null);
  const text = buildShareText(result, title);

  const shareWhatsApp = () => {
    const win = window.open(whatsappUrl(text), '_blank');
    if (win) {
      win.opener = null;
    } else {
      setDialog('whatsapp-failed'); // blocked by the browser
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Result copied. Paste it into any chat.');
      setDialog(null);
    } catch {
      setDialog('manual-copy'); // clipboard unavailable or permission denied
    }
  };

  const exportFile = async (kind: 'image' | 'pdf') => {
    setBusy(kind);
    try {
      if (kind === 'image') {
        if (!captureRef.current) throw new Error('Nothing to export');
        await downloadImage(captureRef.current);
      } else {
        await downloadPdf(result, title, savedAt);
      }
    } catch {
      message.error(`Couldn't create the ${kind === 'image' ? 'image' : 'PDF'}. Please try again.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Space wrap className="share-actions" aria-label="Share or export">
        <Button icon={<WhatsAppOutlined />} onClick={shareWhatsApp}>
          WhatsApp
        </Button>
        <Button icon={<CopyOutlined />} onClick={copyText}>
          Copy text
        </Button>
        <Button icon={<PictureOutlined />} loading={busy === 'image'} onClick={() => exportFile('image')}>
          Image
        </Button>
        <Button icon={<FilePdfOutlined />} loading={busy === 'pdf'} onClick={() => exportFile('pdf')}>
          PDF
        </Button>
      </Space>

      <Modal
        open={dialog !== null}
        title={dialog === 'whatsapp-failed' ? 'WhatsApp is unavailable' : 'Copy the result'}
        onCancel={() => setDialog(null)}
        footer={
          dialog === 'whatsapp-failed' ? (
            <Button type="primary" icon={<CopyOutlined />} onClick={copyText}>
              Copy text
            </Button>
          ) : (
            <Button onClick={() => setDialog(null)}>Done</Button>
          )
        }
      >
        {dialog === 'whatsapp-failed' ? (
          <Alert type="info" showIcon message="Couldn't open WhatsApp. Copy the result text and paste it into any chat." />
        ) : (
          <>
            <p>Your browser didn't allow automatic copying. Select the text below and copy it.</p>
            <Input.TextArea
              readOnly
              value={text}
              autoSize={{ minRows: 4, maxRows: 12 }}
              aria-label="Result text"
              onFocus={(e) => e.currentTarget.select()}
              autoFocus
            />
          </>
        )}
      </Modal>
    </>
  );
}
