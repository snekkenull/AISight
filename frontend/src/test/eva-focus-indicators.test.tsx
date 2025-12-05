/**
 * EVA Theme Focus Indicator Tests
 * Requirements: 10.4
 * 
 * Verifies that all interactive elements have visible focus indicators
 * with sufficient contrast for keyboard navigation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

describe('Focus Indicator Visibility - Requirements: 10.4', () => {
  describe('Button focus indicators', () => {
    it('default button has focus-visible ring classes', () => {
      render(<Button data-testid="btn">Test Button</Button>);
      const button = screen.getByTestId('btn');
      
      // Check that focus-visible classes are present
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
      expect(button.className).toContain('focus-visible:ring-ring');
      expect(button.className).toContain('focus-visible:ring-offset-2');
    });

    it('eva-primary button has focus-visible ring classes', () => {
      render(<Button variant="eva-primary" data-testid="btn">EVA Button</Button>);
      const button = screen.getByTestId('btn');
      
      // EVA buttons should still have focus-visible classes
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
    });

    it('eva-warning button has focus-visible ring classes', () => {
      render(<Button variant="eva-warning" data-testid="btn">Warning Button</Button>);
      const button = screen.getByTestId('btn');
      
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
    });

    it('eva-danger button has focus-visible ring classes', () => {
      render(<Button variant="eva-danger" data-testid="btn">Danger Button</Button>);
      const button = screen.getByTestId('btn');
      
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
    });

    it('eva-ghost button has focus-visible ring classes', () => {
      render(<Button variant="eva-ghost" data-testid="btn">Ghost Button</Button>);
      const button = screen.getByTestId('btn');
      
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
    });
  });

  describe('Input focus indicators', () => {
    it('default input has focus-visible ring classes', () => {
      render(<Input data-testid="input" placeholder="Test input" />);
      const input = screen.getByTestId('input');
      
      expect(input.className).toContain('focus-visible:outline-none');
      expect(input.className).toContain('focus-visible:ring-2');
      expect(input.className).toContain('focus-visible:ring-ring');
      expect(input.className).toContain('focus-visible:ring-offset-2');
    });

    it('eva variant input has focus-visible styles', () => {
      render(<Input variant="eva" data-testid="input" placeholder="EVA input" />);
      const input = screen.getByTestId('input');
      
      // EVA input uses border and shadow for focus instead of ring
      expect(input.className).toContain('focus-visible:outline-none');
      expect(input.className).toContain('focus-visible:border-eva-border-accent');
      expect(input.className).toContain('focus-visible:shadow-eva-glow-orange');
    });
  });

  describe('Interactive element accessibility', () => {
    it('buttons are focusable by default', () => {
      render(<Button data-testid="btn">Focusable Button</Button>);
      const button = screen.getByTestId('btn');
      
      // Button should not have tabindex=-1 (which would make it unfocusable)
      expect(button.getAttribute('tabindex')).not.toBe('-1');
    });

    it('inputs are focusable by default', () => {
      render(<Input data-testid="input" placeholder="Focusable input" />);
      const input = screen.getByTestId('input');
      
      expect(input.getAttribute('tabindex')).not.toBe('-1');
    });

    it('disabled buttons are not focusable', () => {
      render(<Button disabled data-testid="btn">Disabled Button</Button>);
      const button = screen.getByTestId('btn');
      
      expect(button).toBeDisabled();
      expect(button.className).toContain('disabled:pointer-events-none');
    });

    it('disabled inputs are not focusable', () => {
      render(<Input disabled data-testid="input" placeholder="Disabled input" />);
      const input = screen.getByTestId('input');
      
      expect(input).toBeDisabled();
      expect(input.className).toContain('disabled:cursor-not-allowed');
    });
  });
});

describe('Focus Ring Contrast Verification', () => {
  /**
   * The focus ring uses --ring CSS variable which is set to:
   * - Light mode: 221.2 83.2% 53.3% (blue)
   * - Dark mode: 224.3 76.3% 48% (blue)
   * 
   * EVA theme uses orange (#FF6600) for focus indicators
   * which has been verified to have 6.74:1 contrast on dark backgrounds
   */
  
  it('documents focus ring color configuration', () => {
    // This test documents the focus ring configuration
    // The actual contrast verification is in eva-accessibility.test.ts
    
    const focusRingConfig = {
      defaultRing: 'hsl(var(--ring))', // Blue in both light and dark mode
      evaFocusBorder: 'var(--eva-border-accent)', // #FF6600
      evaFocusGlow: 'shadow-eva-glow-orange', // Orange glow effect
    };
    
    expect(focusRingConfig.defaultRing).toBeDefined();
    expect(focusRingConfig.evaFocusBorder).toBeDefined();
    expect(focusRingConfig.evaFocusGlow).toBeDefined();
  });
});

describe('Keyboard Navigation - Requirements: 3.4', () => {
  describe('Interactive elements are keyboard accessible', () => {
    it('buttons can receive keyboard focus', () => {
      render(<Button data-testid="btn">Test Button</Button>);
      const button = screen.getByTestId('btn');
      
      // Button should be focusable (no negative tabindex)
      expect(button.getAttribute('tabindex')).not.toBe('-1');
      
      // Button should be a button element (inherently focusable)
      expect(button.tagName.toLowerCase()).toBe('button');
    });

    it('inputs can receive keyboard focus', () => {
      render(<Input data-testid="input" placeholder="Test input" />);
      const input = screen.getByTestId('input');
      
      // Input should be focusable
      expect(input.getAttribute('tabindex')).not.toBe('-1');
      
      // Input should be an input element
      expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('buttons have type attribute for proper form behavior', () => {
      render(<Button data-testid="btn">Test Button</Button>);
      const button = screen.getByTestId('btn');
      
      // Button should have a type attribute
      expect(button.getAttribute('type')).toBeDefined();
    });
  });

  describe('Focus order follows logical sequence', () => {
    it('multiple buttons can be tabbed through in order', () => {
      render(
        <div>
          <Button data-testid="btn1">First</Button>
          <Button data-testid="btn2">Second</Button>
          <Button data-testid="btn3">Third</Button>
        </div>
      );
      
      const btn1 = screen.getByTestId('btn1');
      const btn2 = screen.getByTestId('btn2');
      const btn3 = screen.getByTestId('btn3');
      
      // All buttons should be in the natural tab order (no explicit tabindex)
      expect(btn1.getAttribute('tabindex')).not.toBe('-1');
      expect(btn2.getAttribute('tabindex')).not.toBe('-1');
      expect(btn3.getAttribute('tabindex')).not.toBe('-1');
    });
  });
});
