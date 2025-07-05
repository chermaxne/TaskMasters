import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './src/Login';

describe('Login Component', () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: 'mock-token' }),
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form by default', () => {
    render(<Login onLogin={mockOnLogin} />);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  test('switches to register mode', () => {
  render(<Login onLogin={mockOnLogin} />);
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  
  expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
});

  test('validates form inputs', async () => {
    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.click(screen.getByText('Sign In'));
    
    expect(await screen.findByText('Username is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Test123!' } });
    fireEvent.click(screen.getByText('Sign In'));
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/login'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username: 'testuser', password: 'Test123!' }),
      });
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  test('shows error on failed login', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.reject(new Error('Invalid credentials'))
    );
    
    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByText('Sign In'));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});