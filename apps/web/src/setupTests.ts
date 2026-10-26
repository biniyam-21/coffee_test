import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.scrollTo in jsdom test environments
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}
