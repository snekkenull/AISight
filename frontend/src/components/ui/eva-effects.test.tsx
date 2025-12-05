import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvaEffects, EvaLoader, EvaCounter, EvaWarningBorder } from './eva-effects';

describe('EVA Effects Components', () => {
  beforeEach(() => {
    // Mock matchMedia for reduced motion tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe('EvaEffects', () => {
    it('renders scan lines and vignette by default', () => {
      const { container } = render(<EvaEffects />);
      const overlay = container.querySelector('.fixed.inset-0.pointer-events-none');
      expect(overlay).toBeTruthy();
    });

    it('respects reduced motion preference', () => {
      // Mock reduced motion preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(<EvaEffects />);
      const overlay = container.querySelector('.fixed.inset-0.pointer-events-none');
      expect(overlay).toBeTruthy();
      // Effects should not render when reduced motion is preferred
      expect(overlay?.children.length).toBe(0);
    });

    it('can disable scan lines', () => {
      const { container } = render(<EvaEffects enableScanLines={false} />);
      const overlay = container.querySelector('.fixed.inset-0.pointer-events-none');
      expect(overlay).toBeTruthy();
    });

    it('can disable vignette', () => {
      const { container } = render(<EvaEffects enableVignette={false} />);
      const overlay = container.querySelector('.fixed.inset-0.pointer-events-none');
      expect(overlay).toBeTruthy();
    });
  });

  describe('EvaLoader', () => {
    it('renders with default size', () => {
      render(<EvaLoader />);
      expect(screen.getByRole('status')).toBeTruthy();
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('renders with small size', () => {
      const { container } = render(<EvaLoader size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('24');
    });

    it('renders with large size', () => {
      const { container } = render(<EvaLoader size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('72');
    });

    it('applies custom color', () => {
      const { container } = render(<EvaLoader color="#FF0000" />);
      const polygon = container.querySelector('polygon');
      expect(polygon?.getAttribute('stroke')).toBe('#FF0000');
    });
  });

  describe('EvaCounter', () => {
    it('renders initial value', () => {
      const { container } = render(<EvaCounter value={100} />);
      const span = container.querySelector('span');
      expect(span).toBeTruthy();
      expect(span?.textContent).toBeTruthy();
    });

    it('applies custom format function', () => {
      const format = (n: number) => `$${n.toFixed(2)}`;
      const { container } = render(<EvaCounter value={100} format={format} />);
      const span = container.querySelector('span');
      expect(span?.textContent).toMatch(/\$/);
    });

    it('has tabular-nums class for aligned numbers', () => {
      const { container } = render(<EvaCounter value={100} />);
      const span = container.querySelector('span');
      expect(span?.className).toContain('tabular-nums');
    });
  });

  describe('EvaWarningBorder', () => {
    it('renders children', () => {
      render(
        <EvaWarningBorder active={false}>
          <div>Test Content</div>
        </EvaWarningBorder>
      );
      expect(screen.getByText('Test Content')).toBeTruthy();
    });

    it('renders wrapper with relative positioning', () => {
      const { container } = render(
        <EvaWarningBorder active={true}>
          <div>Test Content</div>
        </EvaWarningBorder>
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('relative');
    });

    it('renders animation style when active', () => {
      const { container } = render(
        <EvaWarningBorder active={true}>
          <div>Test Content</div>
        </EvaWarningBorder>
      );
      // Check that style tag is rendered for animation
      const styleTag = container.querySelector('style');
      expect(styleTag).toBeTruthy();
      expect(styleTag?.textContent).toContain('eva-warning-pulse');
    });

    it('does not render animation style when inactive', () => {
      const { container } = render(
        <EvaWarningBorder active={false}>
          <div>Test Content</div>
        </EvaWarningBorder>
      );
      // No style tag should be rendered when inactive
      const styleTag = container.querySelector('style');
      expect(styleTag).toBeFalsy();
    });
  });
});
