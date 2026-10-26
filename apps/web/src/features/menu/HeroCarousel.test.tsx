import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HeroCarousel, HERO_SLIDES } from './HeroCarousel';

describe('<HeroCarousel />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders initial slide headline, subtitle, quote, and explore button', () => {
    const onExploreMock = vi.fn();
    render(<HeroCarousel onExploreClick={onExploreMock} />);

    expect(screen.getByText(HERO_SLIDES[0].headline)).toBeInTheDocument();
    expect(screen.getByText(HERO_SLIDES[0].subtitle)).toBeInTheDocument();
    expect(screen.getByText(HERO_SLIDES[0].quote)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore menu/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /explore menu/i }));
    expect(onExploreMock).toHaveBeenCalledTimes(1);
  });

  it('auto-advances slides automatically after interval elapsed without manual buttons', () => {
    render(<HeroCarousel />);

    expect(screen.getByText(HERO_SLIDES[0].headline)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5500);
    });

    expect(screen.getByText(HERO_SLIDES[1].headline)).toBeInTheDocument();
  });

  it('renders bottom-center automatic pagination indicators for all slides', () => {
    render(<HeroCarousel />);

    const indicators = screen.getAllByRole('tab');
    expect(indicators.length).toBe(HERO_SLIDES.length);
  });
});
