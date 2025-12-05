# Requirements Document

## Introduction

This specification defines a comprehensive transformation of the AIS vessel tracking application into a full CRT terminal interface inspired by EVA (Neon Genesis Evangelion) NERV command centers. The redesign simulates an old-school CRT monitor with curved glass effects, restructures the entire layout into a terminal-based interface with permanent function blocks, and adds advanced visualization components including a P5.js Earth globe, digital gauges, track charts, and radar scanning modules. The interface removes modern UI patterns (floating buttons, emoji icons, rounded elements) in favor of authentic terminal aesthetics with sound effects and pixelated iconography.

## Glossary

- **CRT Effect**: Visual simulation of a Cathode Ray Tube monitor including curved glass distortion, scan lines, phosphor glow, and screen curvature
- **Terminal Interface**: Command-line inspired UI with monospace text, bordered windows, and keyboard-centric interaction patterns
- **Function Block**: A permanent display panel on the left or right side of the screen showing specialized visualizations
- **Status Bar**: A horizontal bar at the top of the screen displaying system status, navigation buttons, and indicators
- **Terminal Dialog**: A command-line style input/output area at the bottom of the screen for AI interaction and system messages
- **P5.js Globe**: A 3D Earth visualization rendered using P5.js library showing current map viewport location
- **Digital Gauge**: A numeric or graphical indicator displaying fleet statistics in retro digital style
- **Track Chart**: A visualization showing the trajectory/path history of a selected vessel
- **Radar Scan Module**: An animated radar-style display showing vessels around the selected vessel
- **Terminal Window**: A bordered panel with title bar styled as a terminal/console window
- **Pixelated Icon**: Low-resolution, pixel-art style iconography
- **Terminal Scrollbar**: A minimalist, text-character based scrollbar design
- **Color Scheme**: A predefined set of terminal colors (foreground, background, accent) that can be switched globally

## Requirements

### Requirement 1: CRT Monitor Simulation

**User Story:** As a user, I want the entire application to simulate a CRT monitor display, so that the interface feels like an authentic retro terminal.

#### Acceptance Criteria

1. WHEN the application renders THEN the CRT_System SHALL apply a spherical-section glass curvature effect to the entire viewport simulating an outward-curved CRT faceplate
2. WHEN the application renders THEN the CRT_System SHALL apply barrel distortion to screen content creating the characteristic CRT bulge effect
3. WHEN the application renders THEN the CRT_System SHALL display RGB color separation at screen edges simulating chromatic aberration
4. WHEN the application renders THEN the CRT_System SHALL apply a subtle phosphor glow effect to bright elements
5. WHEN the application renders THEN the CRT_System SHALL display horizontal scan lines with configurable intensity
6. WHEN the application renders THEN the CRT_System SHALL apply a vignette effect darkening the curved screen edges
7. WHEN the user enables reduced motion THEN the CRT_System SHALL disable animated effects while maintaining static visual styling

### Requirement 2: Terminal Layout Structure

**User Story:** As a user, I want the application organized as a terminal interface with distinct zones, so that information is presented in a command-center layout.

#### Acceptance Criteria

1. WHEN the application renders THEN the Layout_System SHALL display a status bar fixed at the top of the screen spanning full width
2. WHEN the application renders THEN the Layout_System SHALL display the map as the central main element occupying the largest screen area
3. WHEN the application renders THEN the Layout_System SHALL display permanent function blocks on the left side of the map
4. WHEN the application renders THEN the Layout_System SHALL display permanent function blocks on the right side of the map
5. WHEN the application renders THEN the Layout_System SHALL display a terminal dialog box fixed at the bottom of the screen
6. WHEN the layout renders THEN the Layout_System SHALL NOT display a collapsible side dock navigation pattern
7. WHEN the viewport resizes THEN the Layout_System SHALL maintain proportional sizing of all zones while keeping function blocks visible

### Requirement 3: Status Bar Navigation

**User Story:** As a user, I want navigation and status controls in a top status bar, so that I can access functions without a side dock.

#### Acceptance Criteria

1. WHEN the status bar renders THEN the StatusBar_System SHALL display text-based buttons for all navigation functions previously in the side dock
2. WHEN the status bar renders THEN the StatusBar_System SHALL display system status indicators (connection, vessel count, time)
3. WHEN the status bar renders THEN the StatusBar_System SHALL display the color scheme switcher button
4. WHEN a status bar button is clicked THEN the StatusBar_System SHALL execute the associated function or toggle the associated panel
5. WHEN the status bar renders THEN the StatusBar_System SHALL use terminal-style bordered button styling with monospace text

### Requirement 4: Terminal Window Styling

**User Story:** As a user, I want all panels and cards styled as terminal windows, so that the interface maintains consistent terminal aesthetics.

#### Acceptance Criteria

1. WHEN rendering any card or panel THEN the Window_System SHALL apply a bordered terminal window frame with title bar
2. WHEN rendering terminal window borders THEN the Window_System SHALL use ASCII-style or single-line box-drawing characters
3. WHEN rendering terminal window title bars THEN the Window_System SHALL display the window title in uppercase monospace text
4. WHEN rendering terminal window content THEN the Window_System SHALL apply consistent padding and monospace typography
5. WHEN rendering terminal windows THEN the Window_System SHALL NOT use rounded corners or gradient backgrounds

### Requirement 5: P5.js Earth Globe Visualization

**User Story:** As a user, I want to see a 3D Earth globe showing my current map view location, so that I have global spatial context.

#### Acceptance Criteria

1. WHEN the left function block renders THEN the Globe_System SHALL display a P5.js rendered 3D Earth globe
2. WHEN the globe renders THEN the Globe_System SHALL load and display GeoJSON country boundaries on the globe surface
3. WHEN the map viewport changes THEN the Globe_System SHALL highlight the current viewport location on the globe
4. WHEN the globe renders THEN the Globe_System SHALL apply EVA terminal color styling (wireframe or low-poly aesthetic)
5. WHEN the globe renders THEN the Globe_System SHALL animate with slow rotation when idle
6. WHEN a vessel is selected THEN the Globe_System SHALL be replaced by the vessel information panel in the left function block

### Requirement 6: Digital Gauge Display

**User Story:** As a user, I want fleet statistics displayed as digital gauges, so that data appears as retro instrument readouts.

#### Acceptance Criteria

1. WHEN the left function block renders without vessel selection THEN the Gauge_System SHALL display digital gauges for fleet status metrics
2. WHEN rendering digital gauges THEN the Gauge_System SHALL use seven-segment or dot-matrix style numeric displays
3. WHEN gauge values change THEN the Gauge_System SHALL animate the digit transitions with a rolling or flickering effect
4. WHEN rendering gauge labels THEN the Gauge_System SHALL use uppercase monospace text with terminal styling
5. WHEN rendering gauges THEN the Gauge_System SHALL apply the current terminal color scheme

### Requirement 7: Track Chart Visualization

**User Story:** As a user, I want to see a track chart showing the selected vessel's trajectory, so that I can analyze movement patterns.

#### Acceptance Criteria

1. WHEN a vessel is selected THEN the TrackChart_System SHALL display a track chart in the right function block
2. WHEN the track chart renders THEN the TrackChart_System SHALL display the vessel's position history as a line graph or path visualization
3. WHEN the track chart renders THEN the TrackChart_System SHALL display axis labels with coordinate or time information
4. WHEN the track chart renders THEN the TrackChart_System SHALL apply terminal styling with grid lines and monospace labels
5. WHEN no vessel is selected THEN the TrackChart_System SHALL display a placeholder or idle state message

### Requirement 8: Radar Scan Module

**User Story:** As a user, I want a radar display showing vessels around my selected vessel, so that I can see nearby traffic.

#### Acceptance Criteria

1. WHEN a vessel is selected THEN the Radar_System SHALL display a radar scan visualization in the right function block
2. WHEN the radar renders THEN the Radar_System SHALL display a circular radar sweep animation
3. WHEN the radar renders THEN the Radar_System SHALL show nearby vessels as blips relative to the selected vessel's position
4. WHEN the radar renders THEN the Radar_System SHALL display range rings with distance labels
5. WHEN the radar renders THEN the Radar_System SHALL apply terminal color scheme with phosphor glow effects
6. WHEN no vessel is selected THEN the Radar_System SHALL display an idle scanning animation or placeholder

### Requirement 9: Vessel Information Panel Redesign

**User Story:** As a user, I want vessel information displayed in terminal style without emoji icons, so that data presentation matches the interface aesthetic.

#### Acceptance Criteria

1. WHEN a vessel is selected THEN the VesselInfo_System SHALL display vessel details in the left function block replacing the globe
2. WHEN rendering vessel information THEN the VesselInfo_System SHALL NOT display any emoji or unicode pictographic characters
3. WHEN rendering vessel information THEN the VesselInfo_System SHALL use text labels and ASCII-compatible symbols only
4. WHEN rendering vessel data fields THEN the VesselInfo_System SHALL format data in bracketed label-value pairs
5. WHEN rendering vessel information THEN the VesselInfo_System SHALL apply terminal window styling with monospace typography
6. WHEN rendering vessel type indicators THEN the VesselInfo_System SHALL use text abbreviations or pixelated icons

### Requirement 10: Multi-Color Terminal Theme Switching

**User Story:** As a user, I want to switch between multiple terminal color schemes, so that I can customize the visual appearance.

#### Acceptance Criteria

1. WHEN the theme switcher is activated THEN the Theme_System SHALL display a selection of terminal color schemes
2. WHEN a color scheme is selected THEN the Theme_System SHALL apply the scheme globally to all interface elements
3. WHEN the Theme_System provides schemes THEN it SHALL include classic terminal colors (green-on-black, amber-on-black, white-on-black, blue-on-black)
4. WHEN the Theme_System provides schemes THEN it SHALL include EVA-inspired schemes (orange-on-black, red-on-black, purple-on-black)
5. WHEN a scheme is applied THEN the Theme_System SHALL persist the selection to local storage
6. WHEN the application loads THEN the Theme_System SHALL restore the previously selected color scheme

### Requirement 11: Terminal-Style Scrollbars

**User Story:** As a user, I want scrollbars styled as terminal elements, so that scrollable areas match the interface aesthetic.

#### Acceptance Criteria

1. WHEN a scrollable area renders THEN the Scrollbar_System SHALL display a terminal-styled scrollbar
2. WHEN rendering scrollbars THEN the Scrollbar_System SHALL use thin track styling with minimal visual weight
3. WHEN rendering scrollbar thumbs THEN the Scrollbar_System SHALL use solid color matching the terminal color scheme
4. WHEN rendering scrollbars THEN the Scrollbar_System SHALL NOT use rounded corners or gradient styling
5. WHEN the user hovers over a scrollbar THEN the Scrollbar_System SHALL provide subtle highlight feedback

### Requirement 12: Pixelated Icon System

**User Story:** As a user, I want icons displayed in pixelated style, so that iconography matches the retro terminal aesthetic.

#### Acceptance Criteria

1. WHEN rendering icons THEN the Icon_System SHALL use pixel-art style iconography
2. WHEN rendering icons THEN the Icon_System SHALL apply image-rendering: pixelated to prevent smoothing
3. WHEN rendering icons THEN the Icon_System SHALL use a consistent pixel grid size across all icons
4. WHEN rendering icons THEN the Icon_System SHALL apply the current terminal color scheme to icon colors
5. WHEN icons are scaled THEN the Icon_System SHALL maintain crisp pixel edges without anti-aliasing

### Requirement 13: Terminal AI Dialog Interface

**User Story:** As a user, I want the AI chat interface styled as a terminal dialog, so that AI interaction feels like command-line communication.

#### Acceptance Criteria

1. WHEN the AI interface renders THEN the AIDialog_System SHALL display as a terminal window at the bottom of the screen by default
2. WHEN the AI interface renders THEN the AIDialog_System SHALL provide an option to switch position to the right side of the screen
3. WHEN the AI position switches THEN the AIDialog_System SHALL adjust the main layout to accommodate the new position
4. WHEN rendering AI messages THEN the AIDialog_System SHALL display with command-prompt styling (e.g., "> " prefix for user, "< " for AI)
5. WHEN rendering the AI input THEN the AIDialog_System SHALL display as a command-line input with blinking cursor
6. WHEN the AI interface renders THEN the AIDialog_System SHALL NOT display as a floating button overlay
7. WHEN the AI is processing THEN the AIDialog_System SHALL display a terminal-style loading indicator

### Requirement 14: Terminal Sound Effects

**User Story:** As a user, I want terminal-style sound effects for interactions, so that the interface provides audio feedback matching the aesthetic.

#### Acceptance Criteria

1. WHEN a button is clicked THEN the Sound_System SHALL play a terminal click or beep sound effect
2. WHEN text is typed THEN the Sound_System SHALL play subtle keystroke sound effects
3. WHEN an error occurs THEN the Sound_System SHALL play a warning or alert sound effect
4. WHEN data updates THEN the Sound_System SHALL optionally play a data-received blip sound
5. WHEN the radar scans THEN the Sound_System SHALL play a subtle radar ping sound
6. WHEN the Sound_System initializes THEN it SHALL respect user sound preference settings
7. WHEN the user disables sounds THEN the Sound_System SHALL mute all audio feedback

### Requirement 15: Interactive Animation Effects

**User Story:** As a user, I want rich interactive animations, so that the interface feels responsive and alive.

#### Acceptance Criteria

1. WHEN hovering over interactive elements THEN the Animation_System SHALL display glow or highlight animations
2. WHEN clicking buttons THEN the Animation_System SHALL display press feedback animations
3. WHEN panels open or close THEN the Animation_System SHALL animate the transition with terminal-style effects
4. WHEN data values change THEN the Animation_System SHALL animate the value transition
5. WHEN the radar sweeps THEN the Animation_System SHALL display smooth rotation animation with afterglow trails
6. WHEN the globe rotates THEN the Animation_System SHALL display smooth continuous rotation
7. WHEN the user enables reduced motion THEN the Animation_System SHALL disable or minimize animations while maintaining functionality

### Requirement 16: Coverage Display EVA Styling

**User Story:** As a user, I want the coverage/dock content styled with EVA terminal aesthetics, so that all interface elements are visually consistent.

#### Acceptance Criteria

1. WHEN rendering coverage information THEN the Coverage_System SHALL apply terminal window styling
2. WHEN rendering coverage data THEN the Coverage_System SHALL use monospace typography and bracketed labels
3. WHEN rendering coverage indicators THEN the Coverage_System SHALL use the current terminal color scheme
4. WHEN rendering coverage maps or visualizations THEN the Coverage_System SHALL apply grid overlay and terminal styling

