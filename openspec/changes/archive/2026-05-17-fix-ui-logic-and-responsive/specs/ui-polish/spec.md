## ADDED Requirements

### Requirement: Loading states for data fetches
All client-side pages that fetch data SHALL display a loading indicator while the initial data fetch is in progress. The loading state MUST be visually centered in the content area.

#### Scenario: Nodes page initial load
- **WHEN** nodes page mounts and data has not yet loaded
- **THEN** a loading indicator is displayed in the content area

#### Scenario: Groups page initial load
- **WHEN** groups page mounts and data has not yet loaded
- **THEN** a loading indicator is displayed in the content area

#### Scenario: Audit page initial load
- **WHEN** audit page mounts and data has not yet loaded
- **THEN** a loading indicator is displayed in the content area

### Requirement: Error states for failed fetches
All client-side pages that fetch data SHALL display an error message with a retry option when a fetch fails.

#### Scenario: Fetch fails on nodes page
- **WHEN** the /api/nodes request fails
- **THEN** an error message is displayed with a "Retry" button that re-triggers the fetch

#### Scenario: Fetch fails on groups page
- **WHEN** the /api/groups request fails
- **THEN** an error message is displayed with a "Retry" button

### Requirement: Focus-visible styles on interactive elements
All interactive elements (buttons, links, inputs, selects) SHALL have a visible focus indicator when focused via keyboard navigation. The focus ring MUST use the --ring CSS variable color.

#### Scenario: Button receives keyboard focus
- **WHEN** user tabs to a button element
- **THEN** a visible focus ring appears around the button using the --ring color

#### Scenario: Input receives keyboard focus
- **WHEN** user tabs to an input or select element
- **THEN** a visible focus ring appears around the field

### Requirement: Accessible icon-only buttons
All buttons that contain only an icon (no visible text) SHALL have an accessible label via aria-label attribute describing the button's action.

#### Scenario: Delete icon button has label
- **WHEN** a delete button with only a trash icon is rendered
- **THEN** it has an aria-label of "Delete" or equivalent descriptive text

#### Scenario: Close icon button has label
- **WHEN** a close button with only an X icon is rendered
- **THEN** it has an aria-label of "Close" or equivalent descriptive text

#### Scenario: Hamburger menu button has label
- **WHEN** the mobile hamburger menu button is rendered
- **THEN** it has an aria-label of "Open menu" or equivalent descriptive text
