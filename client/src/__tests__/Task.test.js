/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Task from '../Task';  // Adjust path if needed

// Mock global fetch
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
    fireEvent.change(screen.getByPlaceholderText(/task name/i), { target: { value: 'New Task' } });
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2099-12-30' } });
    fireEvent.change(screen.getByLabelText(/priority/i), { target: { value: 'High' } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., 2hr 30min/i), { target: { value: '1hr' } });
  }

  test('renders task stats and form initially', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/tasks/${mockUser.id}`));
    expect(screen.getByText(/total tasks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
    expect(screen.getAllByText(/my tasks/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/shared tasks/i).length).toBeGreaterThan(0);
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

    fireEvent.change(screen.getByPlaceholderText(/e\.g\., 2hr 30min/i), { target: { value: 'invalid' } });

    fireEvent.click(screen.getByText(/create task/i));

    expect(await screen.findByText(/workload format should be like/i)).toBeInTheDocument();
  });

  test('filters tasks by search term', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.change(screen.getByPlaceholderText(/search tasks/i), { target: { value: 'completed' } });

    expect(screen.getByText(/completed task/i)).toBeInTheDocument();
    expect(screen.queryByText(/test task 1/i)).not.toBeInTheDocument();
  });

  test('filters tasks by completion status', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.change(screen.getByLabelText(/^filter:/i), { target: { value: 'completed' } });

    expect(screen.getByText(/completed task/i)).toBeInTheDocument();
    expect(screen.queryByText(/test task 1/i)).not.toBeInTheDocument();
  });

  test('sorts tasks by name', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.change(screen.getByLabelText(/^sort by:/i), { target: { value: 'name' } });

    const taskNames = screen.getAllByRole('checkbox').map((cb) =>
      cb.nextSibling.querySelector('strong').textContent
    );

    expect(taskNames).toEqual(['Completed Task', 'Test Task 1']);
  });

  test('sets current date and time', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });

    fireEvent.click(screen.getByText(/set now/i));

    const dueDateInput = screen.getByLabelText(/due date/i);
    const dueTimeInput = screen.getByLabelText(/due time/i);

    expect(dueDateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dueTimeInput.value).toMatch(/^\d{2}:\d{2}$/);
  });

  test('creates a new task (happy path)', async () => {
    fetch.mockImplementation((url, options) => {
      if (url.endsWith(`/tasks/${mockUser.id}`) && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 99 })
        });
      }
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([...mockTasks, { id: 99, name: 'New Task', date: '2099-12-30', time: '', priority: 'High', workload: '1hr', completed: false }])
        });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSharedTasks)
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fillValidForm();
    fireEvent.click(screen.getByText(/create task/i));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/tasks/${mockUser.id}`), expect.objectContaining({ method: 'POST' }));
      expect(showMessage).not.toHaveBeenCalledWith(expect.stringContaining('error'), 'error');
    });
  });

  test('toggles task completion', async () => {
    fetch.mockImplementation((url, options) => {
      if (url.endsWith(`/tasks/${mockUser.id}`) && options && options.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks)
        });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSharedTasks)
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/tasks/${mockUser.id}`), expect.objectContaining({ method: 'PUT' }));
      expect(showMessage).toHaveBeenCalledWith('Task completed!');
    });
  });

  test('deletes a task', async () => {
    window.confirm = jest.fn(() => true);
    fetch.mockImplementation((url, options) => {
      if (url.includes('/tasks/') && options && options.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTasks) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSharedTasks) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.click(screen.getAllByText(/delete/i)[0]);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/tasks/1'), expect.objectContaining({ method: 'DELETE' }));
      expect(showMessage).toHaveBeenCalledWith('Task deleted successfully');
    });
  });

  test('shares a task with a friend', async () => {
    fetch.mockImplementation((url, options) => {
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        if (options && options.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 99 }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTasks) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSharedTasks) });
      }
      if (url.includes('/friends/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFriends) });
      }
      if (url.endsWith('/tasks/share')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.click(screen.getByText(/share task with friends/i));
    await waitFor(() => {
      expect(fetch.mock.calls.some(call => call[0].includes('/friends/'))).toBe(true);
    });
    const friend1 = await screen.findByText('friend1');
    fireEvent.click(friend1);
    fillValidForm();
    fireEvent.click(screen.getByText(/create task/i));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/tasks/share'), expect.objectContaining({ method: 'POST' }));
    });
  });

  test('handles error when loading tasks fails', async () => {
    fetch.mockImplementation((url) => {
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.reject(new Error('API failure'));
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSharedTasks) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Failed to load tasks', 'error');
    });
  });

  test('handles error when loading shared tasks fails', async () => {
    fetch.mockImplementation((url) => {
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTasks) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.reject(new Error('API failure'));
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Failed to load shared tasks', 'error');
    });
  });

  test('handles error when deleting a task', async () => {
    window.confirm = jest.fn(() => true);
    fetch.mockImplementation((url, options) => {
      if (url.includes('/tasks/') && options && options.method === 'DELETE') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Delete failed' }) });
      }
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTasks) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSharedTasks) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.click(screen.getAllByText(/delete/i)[0]);
    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('Failed to delete task'), 'error');
    });
  });

  test('handles error when toggling completion', async () => {
    fetch.mockImplementation((url, options) => {
      if (url.endsWith(`/tasks/${mockUser.id}`) && options && options.method === 'PUT') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Update failed' }) });
      }
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTasks) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSharedTasks) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('Failed to update task'), 'error');
    });
  });

  test('handles error when sharing a task', async () => {
    fetch.mockImplementation((url, options) => {
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        if (options && options.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 99 }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTasks) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSharedTasks) });
      }
      if (url.includes('/friends/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFriends) });
      }
      if (url.endsWith('/tasks/share')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Share failed' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.click(screen.getByText(/share task with friends/i));
    const friend1 = await screen.findByText('friend1');
    fireEvent.click(friend1);
    fillValidForm();
    fireEvent.click(screen.getByText(/create task/i));
    await waitFor(() => {
      expect(showMessage).toHaveBeenCalledWith('Share failed', 'error');
    });
  });

  test('shows validation error for short task name', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.change(screen.getByPlaceholderText(/task name/i), { target: { value: 'ab' } });
    fireEvent.click(screen.getByText(/create task/i));
    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
  });

  test('shows validation error for past due date', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.change(screen.getByPlaceholderText(/task name/i), { target: { value: 'Valid Task' } });
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByLabelText(/priority/i), { target: { value: 'High' } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., 2hr 30min/i), { target: { value: '1hr' } });
    fireEvent.click(screen.getByText(/create task/i));
    expect(await screen.findByText(/due date cannot be in the past/i)).toBeInTheDocument();
  });

  test('shows validation error for missing priority', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.change(screen.getByPlaceholderText(/task name/i), { target: { value: 'Valid Task' } });
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2099-12-30' } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., 2hr 30min/i), { target: { value: '1hr' } });
    fireEvent.click(screen.getByText(/create task/i));
    expect(await screen.findByText(/priority is required/i)).toBeInTheDocument();
  });

  test('can select and deselect multiple friends for sharing', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/friends/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFriends) });
      }
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTasks) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSharedTasks) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.click(screen.getByText(/share task with friends/i));
    const friend1 = await screen.findByText('friend1');
    const friend2 = await screen.findByText('friend2');
    fireEvent.click(friend1);
    fireEvent.click(friend2);
    // Deselect friend1
    fireEvent.click(friend1);
    // No assertion needed, just ensure no crash and UI updates
  });

  test('shows empty state for personal and shared tasks', async () => {
    fetch.mockImplementation((url) => {
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/shared tasks/i));
    expect(screen.getByText(/no tasks have been shared with you yet/i)).toBeInTheDocument();
  });

  test('shows overdue label for overdue task', async () => {
    const overdueTask = [{ ...mockTasks[0], date: '2000-01-01', completed: false }];
    fetch.mockImplementation((url) => {
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(overdueTask) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    expect(screen.getByText('OVERDUE')).toBeInTheDocument();
  });

  test('can cancel sharing mode', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/friends/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFriends) });
      }
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTasks) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSharedTasks) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.click(screen.getByText(/share task with friends/i));
    fireEvent.click(screen.getByText(/cancel sharing/i));
    // No assertion needed, just ensure no crash and UI updates
  });

  test('sorts and filters with no tasks', async () => {
    fetch.mockImplementation((url) => {
      if (url.endsWith(`/tasks/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.endsWith(`/tasks/shared/${mockUser.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    await act(async () => {
      render(<Task user={mockUser} showMessage={showMessage} />);
    });
    fireEvent.change(screen.getByLabelText(/^sort by:/i), { target: { value: 'name' } });
    fireEvent.change(screen.getByLabelText(/^filter:/i), { target: { value: 'completed' } });
    expect(screen.getByText(/no tasks found matching your criteria/i)).toBeInTheDocument();
  });
});
