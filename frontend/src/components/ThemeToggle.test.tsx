/**
 * ThemeToggle Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('ThemeToggle', () => {
  // Clear localStorage and document class before each test
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('transition-colors');
    document.documentElement.classList.remove('duration-200');
  });

  it('should render theme toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDefined();
  });

  it('should toggle theme when clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    
    // Initial state should be light mode (moon icon)
    expect(button.getAttribute('aria-label')).toContain('dark');
    
    // Click to toggle to dark mode
    fireEvent.click(button);
    
    // Should now show sun icon (switch to light mode)
    expect(button.getAttribute('aria-label')).toContain('light');
  });

  it('should have proper accessibility attributes', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBeTruthy();
    expect(button.getAttribute('title')).toBeTruthy();
  });

  it('should apply dark class to document root when theme is dark', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    const root = document.documentElement;
    
    // Initially should not have dark class
    expect(root.classList.contains('dark')).toBe(false);
    
    // Click to toggle to dark mode
    fireEvent.click(button);
    
    // Should now have dark class
    expect(root.classList.contains('dark')).toBe(true);
    
    // Click again to toggle back to light mode
    fireEvent.click(button);
    
    // Should not have dark class
    expect(root.classList.contains('dark')).toBe(false);
  });
});
