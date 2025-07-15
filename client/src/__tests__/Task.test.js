/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Task from '../Task';

// Mock fetch globally
global.fetch = jest.fn();

const mockUser = { id: '123', username: 'testuser' };

const mockTasks = [
  {
    id: 1,
    name: 'Test Task 1',
    date: '2099-12-31',
    time: '12:00',
    priority: 'High',
    workload: '2hr',
    completed: false,
  },
  {
    id: 2,
    name: 'Completed Task',
    date: '2099-01-01',
    time: '09:00',
    priority: 'Low',
    workload: '30min',
    completed: true,
  },
];

const mockSharedTasks = [
  {
    id: 3,
    name: 'Shared Task',
    date: '2099-06-30',
    time: '15:00',
    priority: 'Medium',
    workload: '1hr',
    completed: false,
    owner_username: 'friend1',
  },
];

const mockFriends = [
  { id: 10, username: 'friend1' },
  { id: 11, username: 'friend2' },
];

describe('Task component', () => {
  let messages = [];
  const showMessage = jest.fn((msg, type) => messages.push({ msg, type }));

  beforeEach(() => {
    messages = [];
    fetch.mockReset();

    // Mock /tasks/:id response
    fetch.mockImplementation((url) => {
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks),
        });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSharedTasks),
        });
      }
      if (url.includes('/friends/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFriends),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  function fillValidForm() {
    fireEvent.change(screen.getByPlaceholderText(/task name/i), {
      target: { value: 'New Task' },
    });
    fireEvent.change(screen.getByLabelText(/due date/i), {
      target: { value: '2099-12-30' },
    });
    fireEvent.change(screen.getByLabelText(/priority/i), {
      target: { value: 'High' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., 2hr 30min/i), {
      target: { value: '1hr' },
    });
  }

  test('renders task stats and form initially', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    // Wait for initial tasks loaded
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/tasks/${mockUser.id}`));
    expect(screen.getByText(/total tasks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();

    // Tabs rendered
    expect(screen.getByText(/my tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/shared tasks/i)).toBeInTheDocument();
  });

  test('shows validation errors on empty submit', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.click(screen.getByText(/create task/i));

    expect(await screen.findByText(/task name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/due date is required/i)).toBeInTheDocument();
    expect(screen.getByText(/priority is required/i)).toBeInTheDocument();
    expect(screen.getByText(/workload is required/i)).toBeInTheDocument();
  });

  test('validates workload format', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fillValidForm();

    // Enter invalid workload
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., 2hr 30min/i), {
      target: { value: 'invalid' },
    });

    fireEvent.click(screen.getByText(/create task/i));

    expect(await screen.findByText(/workload format should be like/i)).toBeInTheDocument();
  });

  test('creates a new task successfully', async () => {
    // Mock POST task create
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '100' }),
      })
    );

    // Mock share POST (will not be called in this test)
    fetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );

    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fillValidForm();

    fireEvent.click(screen.getByText(/create task/i));

    await waitFor(() => expect(showMessage).not.toHaveBeenCalledWith(expect.stringContaining('error')));
  });

  test('toggles share mode and selects friends', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.click(screen.getByText(/share task with friends/i));

    expect(await screen.findByText(/share with:/i)).toBeInTheDocument();
    expect(screen.getByText(/friend1/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/friend1/i));
    expect(screen.getByText(/task will be shared with 1 friend\(s\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/cancel sharing/i));
    expect(screen.queryByText(/share with:/i)).not.toBeInTheDocument();
  });

  test('toggles task completion in personal tasks', async () => {
    // Mock PUT toggle
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    await waitFor(() => expect(showMessage).toHaveBeenCalledWith('Task completed!'));
  });

  test('toggles task completion in shared tasks', async () => {
    // Mock PUT toggle
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.click(screen.getByText(/shared tasks/i));

    const checkbox = screen.getAllByRole('checkbox')[0];
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    await waitFor(() => expect(showMessage).toHaveBeenCalledWith('Task completed!'));
  });

  test('deletes a personal task after confirmation', async () => {
    window.confirm = jest.fn(() => true);

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(showMessage).toHaveBeenCalledWith('Task deleted successfully'));
  });

  test('does not delete task if confirmation canceled', async () => {
    window.confirm = jest.fn(() => false);

    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    expect(showMessage).not.toHaveBeenCalled();
  });

  test('filters tasks by search term', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.change(screen.getByPlaceholderText(/search tasks/i), {
      target: { value: 'completed' },
    });

    expect(screen.getByText(/completed task/i)).toBeInTheDocument();
    expect(screen.queryByText(/test task 1/i)).not.toBeInTheDocument();
  });

  test('filters tasks by completion status', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.change(screen.getByLabelText(/^filter:/i), {
      target: { value: 'completed' },
    });

    expect(screen.getByText(/completed task/i)).toBeInTheDocument();
    expect(screen.queryByText(/test task 1/i)).not.toBeInTheDocument();
  });

  test('sorts tasks by name', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.change(screen.getByLabelText(/^sort by:/i), {
      target: { value: 'name' },
    });

    const taskNames = screen.getAllByRole('checkbox').map((cb) => 
      cb.nextSibling.querySelector('strong').textContent
    );

    expect(taskNames).toEqual(['Completed Task', 'Test Task 1']); // Alphabetical order
  });

  test('switches between personal and shared tabs', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.click(screen.getByText(/shared tasks/i));
    expect(screen.getByText(/shared with me/i)).toBeInTheDocument();
    expect(screen.getByText(/shared task/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/my tasks/i));
    expect(screen.getByText(/my tasks/i)).toBeInTheDocument();
  });

  test('sets current date and time', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.click(screen.getByText(/set now/i));

    const dueDateInput = screen.getByLabelText(/due date/i);
    const dueTimeInput = screen.getByLabelText(/due time/i);

    // Date is today and time is current (approximate check)
    expect(dueDateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dueTimeInput.value).toMatch(/^\d{2}:\d{2}$/);
  });
});