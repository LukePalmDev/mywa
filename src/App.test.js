import { render, screen } from '@testing-library/react';
import App from './App';

test('renders whatsapp reader welcome screen', () => {
  render(<App />);
  expect(screen.getByText(/benvenuto su whatsapp reader/i)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /carica chat/i }).length).toBeGreaterThan(0);
});
