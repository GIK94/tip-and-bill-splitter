import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthState } from '../auth/AuthContext';
import { AuthModalContext } from '../auth/AuthModal';
import { api, SavedCalculation, SavedCalculationSummary } from '../lib/api';
import { HistoryPage } from '../pages/HistoryPage';
import { CalculatorForm, CalculatorModal } from './CalculatorModal';

const ana = { id: 1, name: 'Ana', email: 'ana@example.com' };

function renderWithProviders(ui: ReactNode, user: AuthState['user'], openAuth = vi.fn()) {
  const auth: AuthState = { user, loading: false, login: vi.fn(), signup: vi.fn(), logout: vi.fn() };
  render(
    <AntApp>
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <AuthModalContext.Provider value={{ openAuth }}>{ui}</AuthModalContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    </AntApp>,
  );
  return { openAuth };
}

const renderForm = (user: AuthState['user'], openAuth = vi.fn()) =>
  renderWithProviders(<CalculatorForm method="even" onSaved={vi.fn()} />, user, openAuth);

async function fillEvenSplit() {
  const ui = userEvent.setup({ delay: null });
  await ui.type(screen.getByLabelText('Bill amount (incl. tax)'), '100');
  await ui.click(screen.getByText('18%'));
  const people = screen.getByLabelText('Number of people');
  await ui.clear(people);
  await ui.type(people, '3');
  return ui;
}

afterEach(() => vi.restoreAllMocks());

describe('CalculatorForm', () => {
  it('AC-07: shows a result only after Calculate, and clears it when an input changes', async () => {
    renderForm(null);
    const ui = await fillEvenSplit();
    expect(screen.queryByText('Grand total')).not.toBeInTheDocument();

    await ui.click(screen.getByRole('button', { name: /calculate/i }));
    expect(screen.getByText('Grand total')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('$39.34')).toBeInTheDocument();
    expect(within(table).getAllByText('$39.33')).toHaveLength(2);

    await ui.type(screen.getByLabelText('Bill amount (incl. tax)'), '0');
    expect(screen.queryByText('Grand total')).not.toBeInTheDocument();
  });

  it('AC-10: guests are offered Log in / Sign up instead of Save; all share options are offered', async () => {
    renderForm(null);
    const ui = await fillEvenSplit();
    await ui.click(screen.getByRole('button', { name: /calculate/i }));
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByText(/to save this result/)).toBeInTheDocument();
    for (const name of [/whatsapp/i, /copy text/i, /image/i, /pdf/i]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('AC-22: "Log in" opens the login modal and keeps the guest’s result', async () => {
    const { openAuth } = renderForm(null);
    const ui = await fillEvenSplit();
    await ui.click(screen.getByRole('button', { name: /calculate/i }));
    await ui.click(screen.getByRole('button', { name: 'Log in' }));
    expect(openAuth).toHaveBeenCalledWith('login');
    expect(screen.getByText('Grand total')).toBeInTheDocument();
  });

  it('AC-06: shows field errors and no result for invalid input', async () => {
    renderForm(null);
    const ui = userEvent.setup({ delay: null });
    await ui.click(screen.getByRole('button', { name: /calculate/i }));
    expect(screen.getByText('Enter the bill amount.')).toBeInTheDocument();
    expect(screen.getByText('Please fix the highlighted fields.')).toBeInTheDocument();
    expect(screen.queryByText('Grand total')).not.toBeInTheDocument();
  });

  it('AC-17: shows the WhatsApp fallback with Copy text when the link is blocked', async () => {
    renderForm(null);
    const ui = await fillEvenSplit();
    await ui.click(screen.getByRole('button', { name: /calculate/i }));
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    await ui.click(screen.getByRole('button', { name: /whatsapp/i }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/?text=Tip%20%26%20Bill%20Split'), '_blank');
    expect(await screen.findByText("Couldn't open WhatsApp. Copy the result text and paste it into any chat.")).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /copy text/i }).length).toBeGreaterThanOrEqual(2);
  });
});

describe('CalculatorModal', () => {
  it('AC-21: saving closes the modal and confirms the save', async () => {
    const save = vi.spyOn(api, 'saveCalculation').mockResolvedValue({ id: 'abc' } as SavedCalculation);
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderWithProviders(<CalculatorModal open method="even" onClose={onClose} onSaved={onSaved} />, ana);
    const ui = await fillEvenSplit();
    await ui.click(screen.getByRole('button', { name: /calculate/i }));
    await ui.click(screen.getByRole('button', { name: /save/i }));
    await ui.type(await screen.findByLabelText('Title (optional)'), 'Team lunch');
    // The title dialog opens on top; its Save button is the last one rendered.
    await ui.click(screen.getAllByRole('button', { name: /save/i }).at(-1)!);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(save).toHaveBeenCalledWith({ title: 'Team lunch', input: expect.objectContaining({ method: 'even', billCents: 10000 }) });
    expect(onSaved).toHaveBeenCalledWith({ id: 'abc' });
    expect(await screen.findByText('Saved to your history.')).toBeInTheDocument();
  });
});

describe('HistoryPage', () => {
  const entry: SavedCalculationSummary = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Friday dinner',
    method: 'itemised',
    totalCents: 6480,
    peopleCount: 3,
    createdAt: new Date().toISOString(),
  };

  it('AC-20: deletes a saved calculation only after confirmation', async () => {
    vi.spyOn(api, 'listCalculations').mockResolvedValue([entry]);
    const del = vi.spyOn(api, 'deleteCalculation').mockResolvedValue(undefined);
    renderWithProviders(<HistoryPage />, ana);
    const ui = userEvent.setup({ delay: null });
    const deleteButton = await screen.findByRole('button', { name: 'Delete Friday dinner' });

    // Cancel keeps it.
    await ui.click(deleteButton);
    await ui.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(del).not.toHaveBeenCalled();
    expect(screen.getByText('Friday dinner')).toBeInTheDocument();

    // Confirm deletes it.
    await ui.click(deleteButton);
    // The cancelled dialog may still be animating out, so use the newest one.
    await waitFor(() => expect(screen.getAllByText('Delete this calculation?').length).toBeGreaterThan(0));
    await ui.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!);
    await waitFor(() => expect(del).toHaveBeenCalledWith(entry.id));
    expect(await screen.findByText('Calculation deleted.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Friday dinner')).not.toBeInTheDocument());
    // Clicking Delete must not also open the details.
    expect(screen.queryByText('Saved calculation')).not.toBeInTheDocument();
  });
});
