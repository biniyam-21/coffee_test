import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from './ToastContext';

const TestComponent: React.FC = () => {
  const { success, error, info, warning } = useToast();

  return (
    <div>
      <button onClick={() => success('Success Title', 'Success message details')}>
        Trigger Success
      </button>
      <button onClick={() => error('Error Title', 'Error message details')}>
        Trigger Error
      </button>
      <button onClick={() => info('Info Title', 'Info message details')}>
        Trigger Info
      </button>
      <button onClick={() => warning('Warning Title', 'Warning message details')}>
        Trigger Warning
      </button>
    </div>
  );
};

describe('Toast Notification System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders and displays success toast at top right', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger Success'));

    expect(screen.getByText('Success Title')).toBeInTheDocument();
    expect(screen.getByText('Success message details')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders different types (error, info, warning)', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger Error'));
    fireEvent.click(screen.getByText('Trigger Info'));
    fireEvent.click(screen.getByText('Trigger Warning'));

    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Info Title')).toBeInTheDocument();
    expect(screen.getByText('Warning Title')).toBeInTheDocument();
  });

  it('dismisses toast when clicking the close button', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger Success'));
    expect(screen.getByText('Success Title')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
  });

  it('auto-dismisses toast after its duration expires', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger Success'));
    expect(screen.getByText('Success Title')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
  });
});
