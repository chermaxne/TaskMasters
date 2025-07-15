import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Calendar from '../Calendar';

describe('Calendar Component', () => {
  let mockShowMessage;

  beforeEach(() => {
    mockShowMessage = jest.fn();
    // Mock window.confirm to always return true by default
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders calendar with current month and year', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    const monthYear = screen.getByText(new RegExp(new Date().toLocaleString('default', { month: 'long' }), 'i'));
    expect(monthYear).toBeInTheDocument();
  });

  test('renders day headers Sun to Sat', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  test('navigates months with Prev and Next buttons', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    const prevBtn = screen.getByText(/prev/i);
    const nextBtn = screen.getByText(/next/i);
    
    // Initial month
    const initialMonth = screen.getByText(new RegExp(new Date().toLocaleString('default', { month: 'long' }), 'i'));

    fireEvent.click(nextBtn);
    const nextMonth = screen.getByText(new RegExp(new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleString('default', { month: 'long' }), 'i'));
    expect(nextMonth).toBeInTheDocument();

    fireEvent.click(prevBtn);
    fireEvent.click(prevBtn);
    const prevMonth = screen.getByText(new RegExp(new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('default', { month: 'long' }), 'i'));
    expect(prevMonth).toBeInTheDocument();
  });

  test('selecting a date updates selectedDate and events list', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    // Get a calendar day that is not empty (e.g. 1 or today's date)
    const calendarDays = screen.getAllByText(new Date().getDate().toString());
    // Click the first available date
    fireEvent.click(calendarDays[0]);
    // Check the selected date displayed in events header matches selectedDate.toDateString()
    const selectedDateText = screen.getByText(new RegExp(new Date().toDateString(), 'i'));
    expect(selectedDateText).toBeInTheDocument();
  });

  test('shows "No events for this date" if no events', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    // Pick a date with no events, e.g. 15 days in future from today (likely no event)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const days = screen.getAllByText(futureDate.getDate().toString());
    if (days.length > 0) fireEvent.click(days[0]);
    const noEvents = screen.getByText(/no events for this date/i);
    expect(noEvents).toBeInTheDocument();
  });

  test('opens event form modal on Add Event click', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    const addBtn = screen.getByRole('button', { name: /add event/i });
    fireEvent.click(addBtn);
    expect(screen.getByText(/add new event/i)).toBeInTheDocument();
  });

  test('can cancel event form modal', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/add new event/i)).not.toBeInTheDocument();
  });

  test('shows error if required fields empty on save', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));
    expect(mockShowMessage).toHaveBeenCalledWith('Please fill in all required fields', 'error');
  });

  test('creates new event successfully', async () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    fireEvent.click(screen.getByRole('button', { name: /add event/i }));

    fireEvent.change(screen.getByLabelText(/title \*/i), { target: { value: 'New Event' } });
    fireEvent.change(screen.getByLabelText(/time \*/i), { target: { value: '10:00' } });

    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Event created successfully', 'success');
    });

    expect(screen.queryByText(/add new event/i)).not.toBeInTheDocument();

    // The new event should appear in the event list for selectedDate
    expect(screen.getByText('New Event')).toBeInTheDocument();
  });

  test('edits existing event', async () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    // Existing event from initial state is "Team Meeting"
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    expect(screen.getByText(/edit event/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/title \*/i), { target: { value: 'Updated Meeting' } });
    fireEvent.click(screen.getByRole('button', { name: /update event/i }));

    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Event updated successfully', 'success');
    });

    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.getByText('Updated Meeting')).toBeInTheDocument();
  });

  test('deletes event with confirmation', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);

    const deleteBtns = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this event?');
    expect(mockShowMessage).toHaveBeenCalledWith('Event deleted successfully', 'success');
  });

  test('does not delete event if confirmation cancelled', () => {
    window.confirm.mockImplementationOnce(() => false);

    render(<Calendar user={{}} showMessage={mockShowMessage} />);

    const deleteBtns = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockShowMessage).not.toHaveBeenCalledWith('Event deleted successfully', 'success');
  });

  test('renders event indicators with correct colors', () => {
    render(<Calendar user={{}} showMessage={mockShowMessage} />);
    // The initial event has type 'meeting', color #4CAF50
    const indicators = screen.getAllByTestId('event-indicator');
    expect(indicators[0]).toHaveStyle('background-color: #4CAF50');
  });
});
