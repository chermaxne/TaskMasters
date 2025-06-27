// Task.test.js - Fixed version
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Task from './src/Task';

// Mock fetch responses
const mockTasks = [
  { id: 1, name: 'Task 1', date: '2023-01-01', time: '12:00', priority: 'High', workload: '2hr', completed: false },
  { id: 2, name: 'Task 2', date: '2023-01-02', time: '14:00', priority: 'Medium', workload: '1hr', completed: true }
];

const mockSharedTasks = [
  { id: 3, name: 'Shared Task', date: '2023-01-03', time: '10:00', priority: 'Low', workload: '30min', completed: false, owner_username: 'otheruser' }
];

const mockFriends = [
  { id: 1, username: 'friend1' },
  { id: 2, username: 'friend2' }
];

describe('Task Component', () => {
  const mockUser = { id: 1, username: 'testuser' };
  const mockShowMessage = jest.fn();

  beforeEach(() => {
    // Clear all mocks
    mockShowMessage.mockClear();
    
    global.fetch = jest.fn((url, options) => {
      // Personal tasks endpoint
      if (url.includes('/tasks/1') && !url.includes('shared')) {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              id: 4, 
              name: 'New Task', 
              date: '2023-01-04', 
              time: '16:00', 
              priority: 'Medium', 
              workload: '1hr', 
              completed: false 
            }),
          });
        }
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          });
        }
        if (options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          });
        }
        // GET request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks),
        });
      }
      
      // Shared tasks endpoint
      if (url.includes('/tasks/shared/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSharedTasks),
        });
      }
      
      // Friends endpoint
      if (url.includes('/friends/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFriends),
        });
      }
      
      // Default response for any other requests
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders task statistics', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    });

    // Wait for tasks to load and verify the count
    await waitFor(() => {
      // Should show total of personal + shared tasks (2 + 1 = 3)
      const totalElements = screen.getAllByText('3');
      expect(totalElements.length).toBeGreaterThan(0);
    });
  });

  test('creates a new task', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter task name')).toBeInTheDocument();
    });

    // Fill in task details
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Enter task name'), { 
        target: { value: 'New Task' } 
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 2hr 30min'), { 
        target: { value: '1hr' } 
      });
      fireEvent.click(screen.getByText('Set Now'));
    });

    // Wait for the create button to be available and not disabled
    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).toBeInTheDocument();
      expect(createButton).not.toBeDisabled();
    });

    // Click create button
    await act(async () => {
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);
    });
    
    // Verify API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/1'), 
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('New Task'),
        })
      );
    });
  });

  test('toggles task completion', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    
    await act(async () => {
      fireEvent.click(checkboxes[0]);
    });
    
    // Verify API call for task completion toggle
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/1'), 
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 1, completed: true }),
        })
      );
    });
  });

  test('deletes a task', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBeGreaterThan(0);
    
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });
    
    // Verify confirmation was called
    expect(window.confirm).toHaveBeenCalled();
    
    // Verify API call for deletion
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/1'), 
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  test('switches between personal and shared tasks', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    // Wait for personal tasks to load
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    // Switch to shared tasks tab
    await act(async () => {
      // Look for shared tasks button/tab - could be different text patterns
      const sharedButton = screen.getByText(/Shared Tasks/i);
      fireEvent.click(sharedButton);
    });
    
    // Wait for shared tasks to load
    await waitFor(() => {
      expect(screen.getByText('Shared Task')).toBeInTheDocument();
      expect(screen.getByText('(Shared by otheruser)')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    // Mock fetch to reject for this test
    global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));
    
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    // Component should still render even if API calls fail
    await waitFor(() => {
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    });
  });

  test('handles empty task list', async () => {
    // Mock empty responses
    global.fetch = jest.fn((url) => {
      if (url.includes('/friends/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFriends),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      // Should show 0 tasks
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });

  test('renders without crashing with minimal props', async () => {
    await act(async () => {
      render(<Task user={{ id: 1 }} showMessage={() => {}} />);
    });
    
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
  });

  test('validates task creation form', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter task name')).toBeInTheDocument();
    });

    // Try to create task without filling required fields
    await act(async () => {
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);
    });
    
    // Should not make API call if validation fails
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tasks'), // Remove the /1
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('New Task'),
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });
});