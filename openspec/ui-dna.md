# UI DNA — Relay Manager

## Design Tokens

- **Colors**: Dark-first palette. Background near-black (#09090b), cards slightly lifted (#111113), muted surfaces (#1c1c1f). Primary blue (#3b82f6) for actions and active states. Semantic: success green (#22c55e), warning amber (#eab308), destructive red (#dc2626).
- **Spacing**: 4px base unit. Common stops: 4, 8, 12, 16, 20, 24, 32. Section gaps use 24–32px. Card padding 20px.
- **Typography**: Inter (system fallback). Ramp: xs (10px badges), sm (13px body), base (14px), lg (18px), xl (20px), 2xl (24px headings), 3xl (30px stat values). Font weights: normal (400), medium (500), semibold (600), bold (700).
- **Radius**: 8px (rounded-lg) for inputs/buttons, 12px (rounded-xl) for cards/panels. Badges use 4px.
- **Shadows**: Three-tier: sm (subtle lift), default (card elevation), md (modals/overlays). All use high-opacity black for dark theme.
- **Z-index**: Sidebar overlay 50, mobile header 40. Content at base layer.
- **Transitions**: 150ms for color/opacity, 200ms for transform/shadow. Ease-out for enters, ease-in for exits.

## Component Patterns

- **Cards**: bg-card, 1px border, rounded-xl, shadow-sm. Hover state adds border-primary/30 + shadow upgrade.
- **Buttons**: Primary (filled blue, white text), Ghost (text-only, hover bg-muted), Destructive (red). All rounded-lg, py-2.5 px-4, text-sm font-medium.
- **Inputs**: bg-muted, 1px border, rounded-lg, py-2.5 px-3.5. Focus ring: 2px offset + 2px primary ring.
- **Tables**: Card wrapper with overflow-hidden. Header row bg-muted, uppercase xs tracking-wider. Body rows divide-y. Row hover not used (links handle interaction).
- **Badges**: Inline-flex, tiny text (10px), border + tinted background. Color-coded by semantic meaning.
- **Empty states**: Centered icon (muted border color) + text-sm message + text-xs hint.

## Interaction & Motion

- Hover: color transitions on links/buttons (150ms). Cards gain border tint + shadow on hover.
- Active nav: tinted background (primary/10) + primary text color. No border indicator currently.
- Status indicators: small dots (1.5–2px radius circles) with semantic color. Static, no animation.
- Opacity reveal: delete buttons appear on card hover (opacity-0 → opacity-100).

## Accessibility Baseline

- Focus-visible ring on all interactive elements (2px offset, primary color).
- Semantic HTML: tables for tabular data, forms with labels, buttons with aria-labels for icon-only actions.
- Color is not sole indicator — status dots paired with text labels.
- Contrast: light text on dark backgrounds meets 4.5:1 minimum for body text.

## Voice & Tone

- Labels are terse and technical: "Source Port", "Destination IP", "Config Version".
- Empty states are helpful but brief: one line what's missing, one line what to do.
- Actions use verbs: "Create", "Delete", "Retry", "Copy".
- No exclamation marks, no emoji, no marketing language.

## Layout & Responsive

- Sidebar: fixed 240px (w-60) on desktop, overlay on mobile with backdrop.
- Content: max-w-6xl, p-8 on desktop, p-4 pt-16 on mobile (below fixed header).
- Grid: 1 col mobile → 2 col sm → 3–4 col lg for cards. Tables scroll horizontally on mobile.
- Breakpoints: sm (640px), md (768px), lg (1024px).

## Anti-patterns

- No light mode — dark only, no theme toggle.
- No animations on page load — content appears instantly.
- No toast notifications — errors inline, success via state refresh.
- No modals/dialogs — forms expand inline within the page flow.
- No infinite scroll — paginated or limited queries.
- No client-side routing animations — Next.js handles transitions.
