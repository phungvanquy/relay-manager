## Context

The Relay Manager dashboard is a Next.js app with a fixed-width sidebar layout. All pages use hardcoded grid columns (e.g., `grid-cols-4`, `grid-cols-2`, `grid-cols-3`) without responsive breakpoints. Tables have no horizontal scroll wrapper. Forms use horizontal flex layouts that overflow on narrow screens. There are no loading skeletons or error states on client-side fetches — failed requests silently show empty data.

The dashboard is used by admins who may access it from various devices including tablets and phones for quick status checks.

## Goals / Non-Goals

**Goals:**
- Make the dashboard fully usable from 320px to 1920px+ viewports
- Add a collapsible mobile sidebar with overlay
- Ensure all data tables are accessible on small screens via horizontal scroll
- Add loading and error feedback for all async data fetches
- Improve keyboard accessibility with visible focus indicators

**Non-Goals:**
- Redesigning the visual style or color scheme
- Adding new features or pages
- Server-side responsive rendering (CSS-only approach)
- PWA or offline support

## Decisions

### 1. Mobile sidebar: overlay drawer vs bottom nav
**Decision**: Overlay drawer with hamburger toggle.
**Rationale**: Bottom nav doesn't scale well with 4+ items and would require significant layout changes. An overlay drawer is the standard pattern for admin dashboards and keeps the existing nav structure intact.

### 2. Responsive tables: horizontal scroll vs card layout on mobile
**Decision**: Horizontal scroll with `overflow-x-auto` wrapper.
**Rationale**: Card layout requires significant restructuring of each table and can make comparison harder. Horizontal scroll is simpler to implement, preserves the table structure, and is a well-understood mobile pattern for data-heavy UIs.

### 3. Loading states: skeleton vs spinner
**Decision**: Simple centered spinner/text for initial loads, inline for actions.
**Rationale**: Skeletons require knowing the exact layout shape ahead of time and add complexity. A simple loading indicator is sufficient for this admin tool where data loads are fast (local SQLite).

### 4. CSS approach: Tailwind responsive prefixes
**Decision**: Use Tailwind's built-in responsive prefixes (`sm:`, `md:`, `lg:`) for all breakpoint changes.
**Rationale**: Already using Tailwind. No additional dependencies needed. Mobile-first approach with progressive enhancement.

## Risks / Trade-offs

- [Sidebar state on navigation] → Store open/closed state in component; auto-close on route change via pathname effect
- [Table horizontal scroll hides columns] → Acceptable trade-off for admin tool; users can scroll to see all data
- [No SSR for client pages] → Loading states handle the flash; converting to server components is out of scope
