import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Calendar from '../Calendar';

describe('Calendar Component', () => {
  const mockUser = { username: 'TestUser' };
  const mockShowMessage = jest.fn();

  beforeEach(() => {
    render(<Calendar user={mockUser} showMessage={mockShowMessage} />);
  });

  test('renders calendar title and navigation', () => {
    expect(screen.getByText(/Calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/Prev/i)).toBeInTheDocument();
    expect(screen.getByText(/Next/i)).toBeInTheDocument();
  });

  test('shows today as selected by default', () => {
    const today = new Date().getDate().toString();
    expect(screen.getAllByText(today)[0]).toBeInTheDocument();
  });

  test('clicking on a date selects it', () => {
    const days = screen.getAllByText('15');
    if (days.length > 0) {
      fireEvent.click(days[0]);
      expect(screen.getByText(/No events for this date/i)).toBeInTheDocument();
    }
  });

  test('adds a new event', () => {
    fireEvent.click(screen.getByText(/Add Event/i));

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test Event' } });
    fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: '1h' } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: 'Room A' } });
    fireEvent.change(screen.getByLabelText(/Attendees/i), { target: { value: 'Alice, Bob' } });

    fireEvent.click(screen.getByText(/Create Event/i));
    expect(mockShowMessage).toHaveBeenCalledWith('Event created successfully', 'success');
  });

  test('edits an event', () => {
    fireEvent.click(screen.getByText(/Edit/i));
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    fireEvent.click(screen.getByText(/Update Event/i));
    expect(mockShowMessage).toHaveBeenCalledWith('Event updated successfully', 'success');
  });

  test('deletes an event', () => {
    window.confirm = jest.fn(() => true); // Mock confirm to always return true
    fireEvent.click(screen.getByText(/Delete/i));
    expect(mockShowMessage).toHaveBeenCalledWith('Event deleted successfully', 'success');
  });
});
