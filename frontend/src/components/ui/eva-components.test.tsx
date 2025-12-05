/**
 * EVA Components Test
 * Tests for EVA-styled UI component variants
 * Requirements: 4.1, 4.2, 4.3, 4.4, 10.1, 10.4, 11.1, 11.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './card';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';

describe('EVA Card Component', () => {
  it('should render eva-panel variant with angular corners', () => {
    render(
      <Card variant="eva-panel" data-testid="eva-card">
        Test Content
      </Card>
    );
    const card = screen.getByTestId('eva-card');
    expect(card).toBeInTheDocument();
    expect(card.className).toContain('eva-clip-corner');
    expect(card.className).toContain('bg-eva-bg-tertiary');
    expect(card.className).toContain('border-eva-border-accent');
  });

  it('should render eva-warning variant', () => {
    render(
      <Card variant="eva-warning" data-testid="eva-warning-card">
        Warning Content
      </Card>
    );
    const card = screen.getByTestId('eva-warning-card');
    expect(card.className).toContain('border-eva-accent-red');
  });

  it('should render eva-critical variant', () => {
    render(
      <Card variant="eva-critical" data-testid="eva-critical-card">
        Critical Content
      </Card>
    );
    const card = screen.getByTestId('eva-critical-card');
    expect(card.className).toContain('border-eva-accent-purple');
  });

  it('should render default variant without EVA styling', () => {
    render(
      <Card data-testid="default-card">
        Default Content
      </Card>
    );
    const card = screen.getByTestId('default-card');
    expect(card.className).not.toContain('eva-clip-corner');
    expect(card.className).toContain('rounded-card');
  });
});

describe('EVA Button Component', () => {
  it('should render eva-primary variant with angular shape', () => {
    render(<Button variant="eva-primary">Primary Action</Button>);
    const button = screen.getByRole('button', { name: /primary action/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('eva-clip-corner');
    expect(button.className).toContain('border-eva-border-accent');
    expect(button.className).toContain('uppercase');
  });

  it('should render eva-warning variant', () => {
    render(<Button variant="eva-warning">Warning Action</Button>);
    const button = screen.getByRole('button', { name: /warning action/i });
    expect(button.className).toContain('border-eva-accent-red');
  });

  it('should render eva-danger variant', () => {
    render(<Button variant="eva-danger">Danger Action</Button>);
    const button = screen.getByRole('button', { name: /danger action/i });
    expect(button.className).toContain('bg-eva-accent-red');
  });

  it('should render eva-ghost variant', () => {
    render(<Button variant="eva-ghost">Ghost Action</Button>);
    const button = screen.getByRole('button', { name: /ghost action/i });
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('border-eva-border-default');
  });

  it('should have active scale animation on EVA buttons', () => {
    render(<Button variant="eva-primary">Test</Button>);
    const button = screen.getByRole('button', { name: /test/i });
    expect(button.className).toContain('active:scale-95');
  });
});

describe('EVA Input Component', () => {
  it('should render eva variant with dark background', () => {
    render(<Input variant="eva" placeholder="Enter text" />);
    const input = screen.getByPlaceholderText(/enter text/i);
    expect(input).toBeInTheDocument();
    expect(input.className).toContain('eva-clip-corner-sm');
    expect(input.className).toContain('bg-eva-bg-secondary');
    expect(input.className).toContain('border-eva-border-default');
  });

  it('should render default variant without EVA styling', () => {
    render(<Input placeholder="Default input" />);
    const input = screen.getByPlaceholderText(/default input/i);
    expect(input.className).not.toContain('eva-clip-corner');
    expect(input.className).toContain('rounded-input');
  });

  it('should have focus glow on EVA input', () => {
    render(<Input variant="eva" placeholder="Focus test" />);
    const input = screen.getByPlaceholderText(/focus test/i);
    expect(input.className).toContain('focus-visible:shadow-eva-glow-orange');
  });
});

describe('EVA Badge Component', () => {
  it('should render eva-orange variant with angular shape', () => {
    render(<Badge variant="eva-orange">ORANGE</Badge>);
    const badge = screen.getByText(/orange/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('eva-clip-corner-sm');
    expect(badge.className).toContain('border-eva-accent-orange');
    expect(badge.className).toContain('uppercase');
  });

  it('should render eva-red variant', () => {
    render(<Badge variant="eva-red">RED</Badge>);
    const badge = screen.getByText(/red/i);
    expect(badge.className).toContain('border-eva-accent-red');
  });

  it('should render eva-purple variant', () => {
    render(<Badge variant="eva-purple">PURPLE</Badge>);
    const badge = screen.getByText(/purple/i);
    expect(badge.className).toContain('border-eva-accent-purple');
  });

  it('should render eva-green variant', () => {
    render(<Badge variant="eva-green">GREEN</Badge>);
    const badge = screen.getByText(/green/i);
    expect(badge.className).toContain('border-eva-accent-green');
  });

  it('should render eva-cyan variant', () => {
    render(<Badge variant="eva-cyan">CYAN</Badge>);
    const badge = screen.getByText(/cyan/i);
    expect(badge.className).toContain('border-eva-accent-cyan');
  });

  it('should use monospace font for EVA badges', () => {
    render(<Badge variant="eva-orange">TEST</Badge>);
    const badge = screen.getByText(/test/i);
    expect(badge.className).toContain('font-eva-mono');
  });
});
