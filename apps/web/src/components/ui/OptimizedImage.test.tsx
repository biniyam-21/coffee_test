import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptimizedImage } from './OptimizedImage';

describe('<OptimizedImage />', () => {
  it('renders skeleton loading shimmer while image is loading', () => {
    render(<OptimizedImage src="https://example.com/latte.jpg" alt="Artisan Latte" />);

    expect(screen.getByTestId('image-skeleton')).toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Artisan Latte' });
    expect(img).toHaveClass('opacity-0');
  });

  it('reveals image and hides skeleton on successful load', () => {
    render(<OptimizedImage src="https://example.com/latte.jpg" alt="Artisan Latte" />);

    const img = screen.getByRole('img', { name: 'Artisan Latte' });
    fireEvent.load(img);

    expect(screen.queryByTestId('image-skeleton')).not.toBeInTheDocument();
    expect(img).toHaveClass('opacity-100');
  });

  it('renders fallback when image fails to load', () => {
    render(
      <OptimizedImage
        src="https://example.com/broken.jpg"
        alt="Broken Coffee"
        fallbackCategory="Hot Coffee"
      />,
    );

    const img = screen.getByRole('img', { name: 'Broken Coffee' });
    fireEvent.error(img);

    expect(screen.getByTestId('image-fallback')).toBeInTheDocument();
    expect(screen.getByText('Hot Coffee')).toBeInTheDocument();
  });

  it('renders fallback immediately when src is null', () => {
    render(<OptimizedImage src={null} alt="No Image Coffee" fallbackCategory="Cold Brews" />);

    expect(screen.getByTestId('image-fallback')).toBeInTheDocument();
    expect(screen.getByText('Cold Brews')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('optimizes Unsplash URLs with width and WebP format and applies lazy loading attributes', () => {
    render(
      <OptimizedImage
        src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd"
        alt="Optimized Brew"
      />,
    );

    const img = screen.getByRole('img', { name: 'Optimized Brew' });
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img.getAttribute('src')).toContain('w=600');
    expect(img.getAttribute('src')).toContain('auto=format');
  });
});
