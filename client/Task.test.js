import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Task from './Task';

global.fetch = jest.fn();
const mockShowMessage = jest.fn();
const mockUser = { id: 1, username: 'testuser' };

beforeAll(() => {
  window.confirm = jest.fn(() => true);
});

beforeEach(() => {
  fetch.mockClear();
  mockShowMessage.mockClear();

  fetch.mockImplementation((url) => {
    if (url.endsWith('/tasks/1')) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (url.endsWith('/tasks/shared/1')) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (url.includes('/tasks/1') && fetch.mock.calls.length > 2) {
      // For POST or PUT
      return Promise.resolve({ ok: true, json: async () => ({ id: 10, name: 'Test Task' }) });
    }
    return Promise.resolve({ ok: true, json: async () => [] });
  });
});

test('renders Task component and shows stats', async () => {
  render(<Task user={mockUser} showMessage={mockShowMessage} />);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(screen.getByText(/Total Tasks/i)).toBeInTheDocument();
});

test('shows validation error when task name is empty and create clicked', async () => {
  render(<Task user={mockUser} showMessage={mockShowMessage} />);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

  fireEvent.click(screen.getByRole('button', { name: /Create Task/i }));

  expect(await screen.findByText(/Task name is required/i)).toBeInTheDocument();
});

test('accepts valid input and calls create API', async () => {
  render(<Task user={mockUser} showMessage={mockShowMessage} />);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

  fireEvent.change(screen.getByPlaceholderText(/Enter task name/i), {
    target: { value: 'Test Task' },
  });
  fireEvent.change(screen.getByLabelText(/Due Date/i), {
    target: { value: '2099-12-31' },
  });
  fireEvent.change(screen.getByLabelText(/Priority/i), {
    target: { value: 'High' },
  });
  fireEvent.change(screen.getByPlaceholderText(/e.g., 2hr 30min/i), {
    target: { value: '2hr' },
  });

  fireEvent.click(screen.getByRole('button', { name: /Create Task/i }));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tasks/1'),
      expect.objectContaining({ method: 'POST' })
    );
  });
  expect(screen.queryByText(/Task name is required/i)).not.toBeInTheDocument();
});
