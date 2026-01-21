import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/test-utils';
import { LoginPage } from '@/pages/LoginPage';

// Create a mock login function
const mockLogin = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: mockLogin,
    isLoading: false,
  }),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
  });

  it('should render login form', () => {
    render(<LoginPage />);

    // Check for input with actual placeholder
    expect(screen.getByPlaceholderText(/COCO001/i)).toBeInTheDocument();
    // Check for submit button
    expect(screen.getByRole('button', { name: /acceder/i })).toBeInTheDocument();
  });

  it('should update input value when typing', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const input = screen.getByPlaceholderText(/COCO001/i);
    await user.type(input, 'c001');

    // Input converts to uppercase
    expect(input).toHaveValue('C001');
  });

  it('should call login when form is submitted', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);

    render(<LoginPage />);

    const input = screen.getByPlaceholderText(/COCO001/i);
    const submitButton = screen.getByRole('button', { name: /acceder/i });

    await user.type(input, 'C001');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('C001');
    });
  });

  it('should show error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid customer code'));

    render(<LoginPage />);

    const input = screen.getByPlaceholderText(/COCO001/i);
    const submitButton = screen.getByRole('button', { name: /acceder/i });

    await user.type(input, 'INVALID');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/code client non trouve/i)).toBeInTheDocument();
    });
  });

  it('should disable button when input is empty', () => {
    render(<LoginPage />);

    // Button should be disabled when input is empty
    const submitButton = screen.getByRole('button', { name: /acceder/i });
    expect(submitButton).toBeDisabled();
  });

  it('should display KLY branding', () => {
    render(<LoginPage />);

    // Should have KLY branding element
    expect(screen.getByText('KLY')).toBeInTheDocument();
  });

  it('should display SAV title', () => {
    render(<LoginPage />);

    expect(screen.getByText(/espace client sav/i)).toBeInTheDocument();
  });

  it('should have help section', () => {
    render(<LoginPage />);

    expect(screen.getByText(/ou trouver votre code client/i)).toBeInTheDocument();
  });
});
