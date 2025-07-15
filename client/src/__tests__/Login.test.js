import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';

describe('Login Component', () => {
  const mockOnLogin = jest.fn();
  const oldFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = oldFetch;
  });

  test('renders login form by default', () => {
    render(<Login onLogin={mockOnLogin} />);
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^password$/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/confirm password/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/need an account\?/i)).toBeInTheDocument();
  });

  test('toggles to registration form', () => {
    render(<Login onLogin={mockOnLogin} />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account\?/i)).toBeInTheDocument();
    // Password requirements text visible
    expect(screen.getByText(/password requirements/i)).toBeInTheDocument();
  });

  test('shows validation errors on empty submit login', async () => {
    render(<Login onLogin={mockOnLogin} />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  test('shows validation errors on invalid username and password on registration', async () => {
    render(<Login onLogin={mockOnLogin} />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'ab' } }); // less than 3 chars
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: 'abc' } }); // less than 6 chars
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'xyz' } }); // doesn't match
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/username must be at least 3 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  test('clears validation error on input change', async () => {
    render(<Login onLogin={mockOnLogin} />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'validuser' } });
    expect(screen.queryByText(/username is required/i)).not.toBeInTheDocument();
  });

  test('toggles password visibility', () => {
    render(<Login onLogin={mockOnLogin} />);
    const pwdInput = screen.getByPlaceholderText(/^password$/i);
    const toggleBtn = screen.getByRole('button', { name: '' }); // no aria-label, but one button in password field

    expect(pwdInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleBtn);

    expect(pwdInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleBtn);

    expect(pwdInput).toHaveAttribute('type', 'password');
  });

  test('login successful submits and calls onLogin', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'testuser', token: 'abc123' }),
    });

    render(<Login onLogin={mockOnLogin} />);
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({ id: 1, username: 'testuser', token: 'abc123' });
    });

    expect(screen.queryByText(/an error occurred/i)).not.toBeInTheDocument();
  });

  test('login failure shows error message', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    render(<Login onLogin={mockOnLogin} />);
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'baduser' } });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: 'badpass' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  test('registration successful resets form and shows success message', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<Login onLogin={mockOnLogin} />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: 'Password1' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'Password1' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/registration successful/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/confirm password/i)).not.toBeInTheDocument();
  });

  test('registration failure shows error message', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Username taken' }),
    });

    render(<Login onLogin={mockOnLogin} />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'existinguser' } });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: 'Password1' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm password/i), { target: { value: 'Password1' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/username taken/i)).toBeInTheDocument();
  });

  test('submit on enter key press triggers handleSubmit', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'enteruser', token: 'abc' }),
    });

    render(<Login onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'enteruser' } });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: 'password123' } });

    fireEvent.keyPress(screen.getByPlaceholderText(/username/i), { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({ id: 1, username: 'enteruser', token: 'abc' });
    });
  });

  test('buttons disabled during loading', async () => {
    let resolveFetch;
    global.fetch.mockImplementation(() => new Promise(res => (resolveFetch = res)));

    render(<Login onLogin={mockOnLogin} />);
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'loadinguser' } });
    fireEvent.change(screen.getByPlaceholderText(/^password$/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();

    resolveFetch({
      ok: true,
      json: async () => ({ id: 1, username: 'loadinguser', token: 'token' }),
    });

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });
});
