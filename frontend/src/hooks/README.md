# Custom Hooks

This directory contains custom React hooks for the Smart AIS MVP application.

## Structure

Hooks encapsulate reusable stateful logic and side effects:

- **useVesselTracking** - WebSocket connection and real-time vessel updates
- **useVesselData** - Vessel data fetching and caching
- **useMapControls** - Map interaction and state management
- **useSearch** - Search and filter logic

## Hook Guidelines

1. **Naming**: All hooks must start with `use` prefix
2. **Single Responsibility**: Each hook should have one clear purpose
3. **TypeScript**: Fully typed parameters and return values
4. **Documentation**: Include JSDoc comments explaining usage
5. **Dependencies**: Clearly document hook dependencies

## Example Hook Structure

```typescript
import { useState, useEffect } from 'react';

interface UseMyHookOptions {
  initialValue: string;
}

interface UseMyHookReturn {
  value: string;
  setValue: (newValue: string) => void;
  isLoading: boolean;
}

/**
 * useMyHook - Brief description of what the hook does
 * 
 * @param options - Hook configuration options
 * @returns Hook state and methods
 * 
 * @example
 * const { value, setValue, isLoading } = useMyHook({ initialValue: 'test' });
 */
export const useMyHook = (options: UseMyHookOptions): UseMyHookReturn => {
  const [value, setValue] = useState(options.initialValue);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Side effects here
  }, [value]);

  return { value, setValue, isLoading };
};
```

## Best Practices

- Keep hooks focused and composable
- Avoid side effects in render phase
- Use `useCallback` and `useMemo` for optimization
- Handle cleanup in `useEffect` return functions
- Test hooks in isolation when possible
