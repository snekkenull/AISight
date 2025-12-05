/**
 * ThemeToggle - Button component to toggle between light and dark themes
 * 
 * Requirements: 4.2, 10.1
 * - EVA angular button styling
 * - Glow effect on hover
 * - Smooth icon transition on theme change
 */

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="eva-ghost"
      size="icon"
      onClick={toggleTheme}
      className="min-w-[44px] min-h-[44px] relative overflow-hidden group"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Sun icon - visible in dark mode */}
      <Sun 
        className={`h-5 w-5 absolute transition-all duration-300 ease-in-out ${
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : 'rotate-90 scale-0 opacity-0'
        }`}
      />
      {/* Moon icon - visible in light mode */}
      <Moon 
        className={`h-5 w-5 absolute transition-all duration-300 ease-in-out ${
          theme === 'light' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
