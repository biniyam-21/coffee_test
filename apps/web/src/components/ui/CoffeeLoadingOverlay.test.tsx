import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoffeeLoadingAnimation } from './CoffeeLoadingAnimation';
import { CoffeeLoadingOverlay } from './CoffeeLoadingOverlay';

describe('<CoffeeLoadingAnimation />', () => {
  it('renders SVG with animated steam paths and coffee elements', () => {
    render(<CoffeeLoadingAnimation size="md" />);

    expect(screen.getByTestId('coffee-loading-animation')).toBeInTheDocument();
    expect(screen.getByLabelText('Animated Ethiopian Coffee Loading')).toBeInTheDocument();
  });
});

describe('<CoffeeLoadingOverlay />', () => {
  it('renders full-screen overlay with custom message, subtext, and branding tag', () => {
    render(
      <CoffeeLoadingOverlay
        message="Signing you in..."
        subtext="Authenticating your artisanal coffee session..."
      />,
    );

    expect(screen.getByTestId('coffee-loading-fullscreen')).toBeInTheDocument();
    expect(screen.getByTestId('coffee-loading-overlay')).toBeInTheDocument();
    expect(screen.getByText('Signing you in...')).toBeInTheDocument();
    expect(screen.getByText('Authenticating your artisanal coffee session...')).toBeInTheDocument();
    expect(screen.getByText('Akufada Coffee Artisans')).toBeInTheDocument();
    expect(screen.getByTestId('coffee-loading-animation')).toBeInTheDocument();
  });

  it('renders inline embedded container when fullScreen is false', () => {
    render(
      <CoffeeLoadingOverlay
        fullScreen={false}
        message="Verifying session..."
        subtext="Preparing your artisanal space..."
      />,
    );

    expect(screen.queryByTestId('coffee-loading-fullscreen')).not.toBeInTheDocument();
    expect(screen.getByTestId('coffee-loading-overlay')).toBeInTheDocument();
    expect(screen.getByText('Verifying session...')).toBeInTheDocument();
  });
});
