// ChatWindow.test.js - Fixed version
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatWindow from './src/ChatWindow';

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { id: 1, sender_id: 1, message: 'Hello', timestamp: '2023-01-01T00:00:00Z', sender_name: 'testuser' },
      { id: 2, sender_id: 2, message: 'Hi there', timestamp: '2023-01-01T00:01:00Z', sender_name: 'frienduser' }
    ]),
  })
);

beforeEach(() => {
  fetch.mockClear();
});

describe('ChatWindow Component', () => {
  const mockUser = { id: 1, username: 'testuser' };
  const mockFriend = { id: 2, username: 'frienduser' };
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  test('renders chat window with header and form', async () => {
    await act(async () => {
      render(<ChatWindow user={mockUser} friend={mockFriend} onClose={mockOnClose} />);
    });
    
    expect(screen.getByText(`Chat with ${mockFriend.username}`)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument();
    
    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there')).toBeInTheDocument();
    });
  });

  test('calls onClose when close button is clicked', async () => {
    await act(async () => {
      render(<ChatWindow user={mockUser} friend={mockFriend} onClose={mockOnClose} />);
    });
    
    // Use aria-label instead of the × symbol
    const closeButton = screen.getByLabelText('Close chat');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('sends a new message', async () => {
    // Mock successful message send
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          id: 3, 
          sender_id: 1, 
          message: 'New message', 
          timestamp: '2023-01-01T00:02:00Z' 
        }),
      })
    );

    await act(async () => {
      render(<ChatWindow user={mockUser} friend={mockFriend} onClose={mockOnClose} />);
    });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: /Send/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'New message' } });
    });
    
    expect(input).toHaveValue('New message');
    
    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Wait for the message to be sent and input to be cleared
    await waitFor(() => {
      expect(input).toHaveValue('');
    });

    // Verify fetch was called
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('New message'),
      })
    );
  });
});

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
    
    global.fetch = jest.fn((url) => {
      if (url.includes('/tasks/1') && !url.includes('shared')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks),
        });
      }
      if (url.includes('/tasks/shared/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSharedTasks),
        });
      }
      if (url.includes('/friends/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFriends),
        });
      }
      // For POST, PUT, DELETE requests
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
      // Use getAllByText since there might be multiple elements with "2"
      const twoElements = screen.getAllByText('3'); // 2 personal + 1 shared = 3 total
      expect(twoElements.length).toBeGreaterThan(0);
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

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Enter task name'), { target: { value: 'New Task' } });
      fireEvent.change(screen.getByPlaceholderText('e.g., 2hr 30min'), { target: { value: '1hr' } });
      fireEvent.click(screen.getByText('Set Now'));
    });

    // Wait for the button text to be available (not in "Creating..." state)
    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).toBeInTheDocument();
      expect(createButton).not.toBeDisabled();
    });

    await act(async () => {
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/tasks/1'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('New Task'),
      });
    });
  });

  test('toggles task completion', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    const checkboxes = screen.getAllByRole('checkbox');
    
    await act(async () => {
      fireEvent.click(checkboxes[0]);
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/tasks/1'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, completed: true }),
      });
    });
  });

  test('deletes a task', async () => {
    window.confirm = jest.fn(() => true);
    
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    const deleteButtons = screen.getAllByText('Delete');
    
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/tasks/1'), {
        method: 'DELETE',
      });
    });
  });

  test('switches between personal and shared tasks', async () => {
    await act(async () => {
      render(<Task user={mockUser} showMessage={mockShowMessage} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText(/Shared Tasks/));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Shared Task')).toBeInTheDocument();
      expect(screen.getByText('(Shared by otheruser)')).toBeInTheDocument();
    });
  });
});