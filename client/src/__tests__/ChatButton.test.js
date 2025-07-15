import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatButton from '../ChatButton';  

jest.mock('../ChatWindow', () => (props) => {
  return (
    <div data-testid="chat-window">
      ChatWindow Mock
      <button onClick={props.onClose}>Close Chat</button>
    </div>
  );
});

describe('ChatButton Component', () => {
  const mockUser = { id: 1, name: 'Alice' };
  const mockFriend = { id: 2, name: 'Bob' };

  test('renders Chat button', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument();
  });

  test('does not show ChatWindow initially', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    expect(screen.queryByTestId('chat-window')).not.toBeInTheDocument();
  });

  test('shows ChatWindow after clicking Chat button', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);
    expect(screen.getByTestId('chat-window')).toBeInTheDocument();
  });

  test('calls onClose and hides ChatWindow when Close Chat button is clicked', () => {
    render(<ChatButton user={mockUser} friend={mockFriend} />);
    const chatButton = screen.getByRole('button', { name: /chat/i });
    fireEvent.click(chatButton);

    const closeButton = screen.getByRole('button', { name: /close chat/i });
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('chat-window')).not.toBeInTheDocument();
  });
});
