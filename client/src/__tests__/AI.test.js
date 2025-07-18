import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AI from '../AI';

// Mock fetch globally
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

const mockUser = { id: '123' };
const mockShowMessage = jest.fn();

const mockPersonalTasks = [
  { id: 1, name: 'Personal Task', priority: 'High', workload: '1 hour', date: '2099-12-31', time: '', completed: false }
];

const mockSharedTasks = [
  { id: 2, name: 'Shared Task', priority: 'Medium', workload: '30 minutes', date: '2099-12-30', time: '', completed: false }
];

const mockCompletedTasks = [
  { id: 3, name: 'Completed Task', priority: 'Low', workload: '45 minutes', date: '2099-12-29', time: '', completed: true }
];

describe('AI Component', () => {
  beforeEach(() => {
    mockShowMessage.mockClear();
  });

  test('renders loading state and task summary', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPersonalTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSharedTasks
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    expect(screen.getByText(/Loading your tasks/)).toBeInTheDocument();

    await waitFor(() => {
      // Use getAllByText for ambiguous text
      expect(screen.getAllByText(/Active Tasks/).length).toBeGreaterThan(1);
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Shared')).toBeInTheDocument();
    });
  });

  test('displays error if personal tasks loading fails', async () => {
    fetch.mockRejectedValueOnce(new Error('API failure'));

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to load tasks', 'error');
    });
  });

  test('displays error if shared tasks loading fails', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPersonalTasks
      })
      .mockRejectedValueOnce(new Error('API failure'));

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to load tasks', 'error');
    });
  });

  test('does not generate if no active tasks', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => expect(screen.getAllByText('Active Tasks').length).toBeGreaterThan(0));

    const generateButton = screen.getByRole('button', { name: /generate/i });
    expect(generateButton).toBeDisabled();
    // Do not expect mockShowMessage to be called, as the button is disabled
  });

  test('generates AI workplan from active tasks', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPersonalTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSharedTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ai: 'AI-Generated Workplan\nTask Analysis Summary' })
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => screen.getByText(/Generate AI Workplan/));

    const button = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Your AI Workplan/)).toBeInTheDocument();
      expect(screen.getByText(/AI-Generated Workplan/)).toBeInTheDocument();
      expect(screen.getByText(/Task Analysis Summary/)).toBeInTheDocument();
    });
  });

  test('handles custom prompt input and generates with custom requirements', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPersonalTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ai: 'Custom Requirements Addressed\nWork only after lunch' })
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => screen.getByText(/Custom Requirements/));

    const customInput = screen.getByPlaceholderText(/Add any specific requirements/);
    fireEvent.change(customInput, {
      target: { value: 'Work only after lunch' }
    });

    const button = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Custom Requirements Addressed/)).toBeInTheDocument();
      // Use getAllByText for ambiguous text
      expect(screen.getAllByText(/Work only after lunch/).length).toBeGreaterThan(0);
    });
  });

  test('can clear AI response', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPersonalTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSharedTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ai: 'AI-Generated Workplan' })
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => screen.getByText(/Generate AI Workplan/));

    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => screen.getByText(/Your AI Workplan/));
    
    const clearButton = screen.getByText(/Clear Response/);
    fireEvent.click(clearButton);
    
    expect(screen.queryByText(/Your AI Workplan/)).not.toBeInTheDocument();
  });

  test('filters out completed tasks from generation', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [...mockPersonalTasks, ...mockCompletedTasks]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSharedTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ai: 'AI-Generated Workplan' })
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => screen.getByText(/Generate AI Workplan/));

    const button = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Your AI Workplan/)).toBeInTheDocument();
      // Should only show active tasks, not completed ones
      expect(screen.queryByText('Completed Task')).not.toBeInTheDocument();
    });
  });

  test('handles empty custom prompt', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPersonalTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ai: 'AI-Generated Workplan' })
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => screen.getByText(/Custom Requirements/));

    const customInput = screen.getByPlaceholderText(/Add any specific requirements/);
    fireEvent.change(customInput, { target: { value: '' } });

    const button = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Your AI Workplan/)).toBeInTheDocument();
      expect(screen.queryByText(/Custom Requirements Addressed/)).not.toBeInTheDocument();
    });
  });

  test('shows task count correctly', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPersonalTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSharedTasks
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => {
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Shared')).toBeInTheDocument();
      // The numbers are in .stat-number spans, so we check for them
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
    });
  });

  test('button is enabled when tasks are loaded', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPersonalTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSharedTasks
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => {
      const generateButton = screen.getByRole('button', { name: /generate/i });
      expect(generateButton).not.toBeDisabled();
    });
  });

  test('handles tasks with different priorities', async () => {
    const mixedPriorityTasks = [
      { id: 1, name: 'High Priority', priority: 'High', workload: '2 hours', date: '2099-12-31', time: '', completed: false },
      { id: 2, name: 'Medium Priority', priority: 'Medium', workload: '1 hour', date: '2099-12-31', time: '', completed: false },
      { id: 3, name: 'Low Priority', priority: 'Low', workload: '30 minutes', date: '2099-12-31', time: '', completed: false }
    ];

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mixedPriorityTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ai: 'AI-Generated Workplan\nHigh Priority\nMedium Priority\nLow Priority' })
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => screen.getByText(/Generate AI Workplan/));

    const button = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Your AI Workplan/)).toBeInTheDocument();
      // Use getAllByText for ambiguous text
      expect(screen.getAllByText(/High Priority/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Medium Priority/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Low Priority/).length).toBeGreaterThan(0);
    });
  });

  test('preserves custom prompt after generation', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPersonalTasks
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ai: 'AI-Generated Workplan' })
      });

    render(<AI user={mockUser} showMessage={mockShowMessage} />);
    
    await waitFor(() => screen.getByText(/Custom Requirements/));

    const customInput = screen.getByPlaceholderText(/Add any specific requirements/);
    fireEvent.change(customInput, { target: { value: 'Focus on morning tasks' } });

    const button = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Your AI Workplan/)).toBeInTheDocument();
      expect(customInput.value).toBe('Focus on morning tasks');
    });
  });
});