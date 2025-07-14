import { render, screen } from '@testing-library/react';
import App from './App';
import React from 'react';

test('renders login form', () => {
  render(<App />);
  const welcomeText = screen.getByText(/welcome back/i);
  expect(welcomeText).toBeInTheDocument();
});
