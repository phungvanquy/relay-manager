## ADDED Requirements

### Requirement: Responsive sidebar navigation
The dashboard layout SHALL provide a collapsible sidebar that adapts to viewport width. On screens below 768px (md breakpoint), the sidebar MUST be hidden by default and accessible via a hamburger menu button. The sidebar MUST appear as an overlay drawer on mobile with a backdrop that closes it when tapped.

#### Scenario: Desktop viewport shows fixed sidebar
- **WHEN** viewport width is 768px or greater
- **THEN** sidebar is visible as a fixed left panel and hamburger button is hidden

#### Scenario: Mobile viewport hides sidebar
- **WHEN** viewport width is below 768px
- **THEN** sidebar is hidden and a hamburger menu button is visible in the top area

#### Scenario: Mobile hamburger opens sidebar overlay
- **WHEN** user taps the hamburger menu button on mobile
- **THEN** sidebar slides in from the left as an overlay with a semi-transparent backdrop

#### Scenario: Clicking backdrop closes mobile sidebar
- **WHEN** mobile sidebar is open and user taps the backdrop area
- **THEN** sidebar closes

#### Scenario: Navigation closes mobile sidebar
- **WHEN** user navigates to a new page via sidebar link on mobile
- **THEN** sidebar automatically closes

### Requirement: Responsive stat cards grid
The overview page stat cards grid SHALL adapt to viewport width. It MUST display 4 columns on large screens (lg+), 2 columns on medium screens (sm-lg), and 1 column on extra-small screens (below sm).

#### Scenario: Large viewport shows 4-column grid
- **WHEN** viewport is lg (1024px) or wider
- **THEN** stat cards display in a 4-column grid

#### Scenario: Medium viewport shows 2-column grid
- **WHEN** viewport is between sm (640px) and lg (1024px)
- **THEN** stat cards display in a 2-column grid

#### Scenario: Small viewport shows single column
- **WHEN** viewport is below sm (640px)
- **THEN** stat cards stack in a single column

### Requirement: Horizontally scrollable data tables
All data tables (nodes, rules, audit log) SHALL be wrapped in a horizontally scrollable container so that table content does not overflow the viewport on narrow screens.

#### Scenario: Table overflows on narrow viewport
- **WHEN** viewport is too narrow to display all table columns
- **THEN** table container allows horizontal scrolling without breaking page layout

### Requirement: Responsive form layouts
All forms (create node, create group, add/edit rule) SHALL stack their fields vertically on mobile viewports instead of using horizontal layouts that overflow.

#### Scenario: Create node form on mobile
- **WHEN** viewport is below md (768px)
- **THEN** form fields (name, group, buttons) stack vertically

#### Scenario: Rule form on mobile
- **WHEN** viewport is below md (768px)
- **THEN** rule form fields (3-column grid) stack to single column

### Requirement: Responsive detail page grids
The node detail page 2-column grid SHALL stack to single column on viewports below md (768px).

#### Scenario: Node detail on mobile
- **WHEN** viewport is below md (768px)
- **THEN** info card and config card stack vertically instead of side-by-side
