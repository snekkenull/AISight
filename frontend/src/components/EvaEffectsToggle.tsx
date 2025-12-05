/**
 * EvaEffectsToggle - Button component to toggle EVA visual effects
 * 
 * Requirements: 3.3
 * - Toggle scan lines and vignette effects on/off
 * - Persists preference to localStorage
 * - EVA angular button styling
 */

import { Sparkles, SparklesIcon } from 'lucide-react';
import { Button } from './ui/button';

interface EvaEffectsToggleProps {
  effectsEnabled: boolean;
  onToggle: () => void;
}

export function EvaEffectsToggle({ effectsEnabled, onToggle }: EvaEffectsToggleProps) {
  return (
    <Button
      variant="eva-ghost"
      size="icon"
      onClick={onToggle}
      className="min-w-[44px] min-h-[44px] relative overflow-hidden group"
      aria-label={`${effectsEnabled ? 'Disable' : 'Enable'} EVA visual effects`}
      title={`${effectsEnabled ? 'Disable' : 'Enable'} EVA visual effects`}
    >
      {/* Sparkles icon - changes opacity based on state */}
      {effectsEnabled ? (
        <Sparkles 
          className="h-5 w-5 text-eva-accent-orange transition-all duration-300"
        />
      ) : (
        <SparklesIcon 
          className="h-5 w-5 text-eva-text-secondary opacity-50 transition-all duration-300"
        />
      )}
      <span className="sr-only">Toggle EVA effects</span>
    </Button>
  );
}
