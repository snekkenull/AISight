# VesselDetailPopup Component

## Overview

The `VesselDetailPopup` component displays detailed vessel information as a floating card within a Leaflet popup. It replaces the basic popup with a modern, feature-rich interface that includes vessel details and action buttons.

## Features

- **Vessel Photo Placeholder**: Gradient background with ship icon
- **Vessel Information**: Name, MMSI, position, speed, course, and last update
- **Stale Data Warning**: Visual indicator when position data is outdated
- **Action Buttons**:
  - **Close**: Dismisses the popup and deselects the vessel
  - **Center Map**: Pans the map to center on the vessel position
  - **Show Track**: Displays the vessel's historical track

## Usage

```tsx
import { VesselDetailPopup } from './components';

<Popup>
  <VesselDetailPopup
    vessel={selectedVessel}
    onClose={() => handleDeselect()}
    onCenterMap={() => handleCenterMap()}
    onShowTrack={() => handleShowTrack()}
  />
</Popup>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `vessel` | `VesselWithPosition \| null` | The vessel to display details for |
| `onClose` | `() => void` | Callback when close button is clicked |
| `onCenterMap` | `() => void` | Callback when center map button is clicked |
| `onShowTrack` | `() => void` | Callback when show track button is clicked |

## Requirements Satisfied

- **5.1**: Displays as a floating detail card positioned near the vessel marker
- **5.2**: Shows vessel photo placeholder, name, MMSI, position, speed, course, and last update
- **5.3**: Close button dismisses the popup and deselects the vessel
- **5.4**: Center Map button smoothly pans the map to center on the vessel
- **5.5**: Popup remains anchored to vessel marker (handled by Leaflet)

## Styling

The component uses Tailwind CSS with dark mode support:
- Modern card design with rounded corners
- Gradient header for visual appeal
- Responsive button layout
- Disabled state for buttons when no position data is available
- Warning banner for stale position data

## Accessibility

- Semantic HTML structure
- ARIA labels for icon-only buttons
- Keyboard navigation support
- Focus indicators on interactive elements
- Disabled state with appropriate visual feedback
