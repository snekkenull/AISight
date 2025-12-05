# Components

This directory contains React components for the Smart AIS MVP application.

## Structure

Components are organized by feature and responsibility:

### Map Components
- **MapComponent** - Main map container with Leaflet integration
- **VesselMarker** - Individual vessel marker on the map
- **VesselPopup** - Popup displaying vessel details
- **VesselTrack** - Vessel track visualization

### UI Components
- **VesselList** - List of active vessels
- **SearchFilter** - Search and filter controls
- **ConnectionStatus** - WebSocket connection indicator
- **ErrorDisplay** - Error message display

## Component Guidelines

1. **Separation of Concerns**: Keep components focused on presentation
2. **Custom Hooks**: Use custom hooks for stateful logic and side effects
3. **TypeScript**: All components should be fully typed
4. **Props Interface**: Define clear prop interfaces for each component
5. **Documentation**: Include JSDoc comments for complex components

## Example Component Structure

```typescript
import React from 'react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

/**
 * MyComponent - Brief description
 * 
 * @param props - Component props
 */
export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```
