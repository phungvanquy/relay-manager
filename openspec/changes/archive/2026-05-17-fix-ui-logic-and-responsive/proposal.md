## Why

The dashboard UI has several responsive design issues and logic gaps that make it difficult to use on smaller screens and introduce potential UX problems. The sidebar has no mobile collapse, stat grids and tables overflow on narrow viewports, forms stack poorly, and there's no loading/error feedback on data fetches.

## What Changes

- Add responsive sidebar with mobile hamburger menu and overlay
- Make overview stat cards grid responsive (4 → 2 → 1 columns)
- Make all data tables horizontally scrollable on small screens
- Fix create-node form to stack vertically on mobile instead of horizontal overflow
- Fix rule form grid (3-col) to stack on smaller viewports
- Add proper loading states and error handling for all client-side data fetches
- Fix node detail page 2-col grid to stack on mobile
- Ensure bootstrap command code blocks don't overflow their containers
- Add viewport meta tag if missing
- Fix accessibility: missing focus styles on interactive elements, proper aria labels on icon-only buttons

## Capabilities

### New Capabilities
- `responsive-layout`: Mobile-first responsive sidebar navigation with hamburger toggle, responsive grids, and scrollable tables across all dashboard pages
- `ui-polish`: Loading skeletons, error states, focus-visible styles, and accessibility improvements for interactive elements

### Modified Capabilities

## Impact

- `dashboard/src/components/layout/DashboardLayout.tsx`: Major refactor for responsive sidebar
- `dashboard/src/app/(dashboard)/page.tsx`: Responsive stat grid
- `dashboard/src/app/(dashboard)/nodes/page.tsx`: Responsive table, form stacking
- `dashboard/src/app/(dashboard)/nodes/[id]/page.tsx`: Responsive 2-col grid
- `dashboard/src/app/(dashboard)/groups/[id]/page.tsx`: Responsive rule form and table
- `dashboard/src/app/(dashboard)/groups/page.tsx`: Minor responsive tweaks
- `dashboard/src/app/(dashboard)/audit/page.tsx`: Responsive table
- `dashboard/src/app/globals.css`: Focus styles, utility additions
