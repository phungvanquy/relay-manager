## 1. Global Styles & Accessibility Foundation

- [x] 1.1 Add focus-visible ring styles to globals.css for buttons, links, inputs, and selects using --ring variable
- [x] 1.2 Add base responsive utility styles (overflow-x-auto wrapper pattern)

## 2. Responsive Sidebar Layout

- [x] 2.1 Refactor DashboardLayout to add mobile hamburger button (hidden on md+)
- [x] 2.2 Add sidebar overlay drawer behavior on mobile (slide-in with backdrop)
- [x] 2.3 Auto-close sidebar on route change using pathname effect
- [x] 2.4 Add aria-label to hamburger button and close button

## 3. Overview Page Responsive

- [x] 3.1 Change stat cards grid from grid-cols-4 to responsive (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4)
- [x] 3.2 Wrap recent activity list for proper mobile display

## 4. Nodes Page Fixes

- [x] 4.1 Add loading state and error handling with retry to nodes page
- [x] 4.2 Wrap nodes table in overflow-x-auto container
- [x] 4.3 Make create-node form stack vertically on mobile (flex-col on small, flex-row on md+)
- [x] 4.4 Ensure bootstrap command code block doesn't overflow

## 5. Node Detail Page Fixes

- [x] 5.1 Change 2-column grid to responsive (grid-cols-1 md:grid-cols-2)
- [x] 5.2 Ensure bootstrap command section is responsive

## 6. Groups Page Fixes

- [x] 6.1 Add loading state and error handling with retry to groups page
- [x] 6.2 Make create-group form responsive

## 7. Group Detail Page Fixes

- [x] 7.1 Add loading state and error handling with retry to group detail page
- [x] 7.2 Wrap rules table in overflow-x-auto container
- [x] 7.3 Make rule form grid responsive (grid-cols-1 md:grid-cols-3)
- [x] 7.4 Add aria-label to delete icon button on group cards

## 8. Audit Page Fixes

- [x] 8.1 Add loading state and error handling with retry to audit page
- [x] 8.2 Wrap audit table in overflow-x-auto container

## 9. Verification

- [x] 9.1 Run TypeScript build to verify no type errors
- [x] 9.2 Test all pages at 320px, 768px, and 1280px viewport widths
