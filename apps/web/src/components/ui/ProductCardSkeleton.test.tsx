import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ProductCardSkeleton,
  ProductCardSkeletonItem,
  PromotionalSidebarSkeleton,
} from './ProductCardSkeleton';

describe('<ProductCardSkeleton />', () => {
  it('renders the requested count of skeleton items', () => {
    render(<ProductCardSkeleton count={6} />);

    expect(screen.getByTestId('product-card-skeletons')).toBeInTheDocument();
    const items = screen.getAllByTestId('product-card-skeleton-item');
    expect(items).toHaveLength(6);
  });

  it('renders individual ProductCardSkeletonItem with matching card structure and centered loading badge', () => {
    render(<ProductCardSkeletonItem />);

    const item = screen.getByTestId('product-card-skeleton-item');
    expect(item).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('renders PromotionalSidebarSkeleton', () => {
    render(<PromotionalSidebarSkeleton />);

    expect(screen.getByTestId('promotional-sidebar-skeleton')).toBeInTheDocument();
  });
});
