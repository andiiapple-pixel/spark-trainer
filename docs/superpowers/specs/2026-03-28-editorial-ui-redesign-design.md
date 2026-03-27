# Pocket Trainer — Editorial UI/UX Redesign

## Overview

Complete visual redesign of the Pocket Trainer app from dark-navy-with-orange to a monochrome editorial sport aesthetic. The goal is a distinctive, magazine-inspired look that doesn't read as AI-generated — bold typography, hard edges, and a single volt-yellow accent on pure black.

The app is mobile-first and mobile-primary. Every decision below assumes a ~390px viewport. No desktop breakpoints are in scope.

## Design Tokens

### Palette

| Token | Value | Usage |
|---|---|---|
| `--surface` | `#0A0A0A` | Page background |
| `--surface-raised` | `#111111` | Cards, stat cells |
| `--surface-border` | `#222222` | Borders, dividers |
| `--text-primary` | `#FFFFFF` | Headlines, primary data |
| `--text-secondary` | `#888888` | Body text, descriptions |
| `--text-muted` | `#555555` | Labels, captions |
| `--accent` | `#E8FF00` | CTAs, active states, highlights |
| `--accent-on` | `#000000` | Text on accent background |
| `--semantic-success` | `#22C55E` | Completed sets, positive trends |
| `--semantic-warning` | `#F59E0B` | Caution, deload suggestions |
| `--semantic-error` | `#EF4444` | Failed sets, destructive actions |

No gradients. No opacity tricks. Flat, solid colors only.

### Typography

| Role | Font | Weight | Transform |
|---|---|---|---|
| Display (hero headings) | Oswald | 700 | uppercase |
| Heading (section titles) | Oswald | 500 | uppercase |
| Body | Inter | 400 | none |
| Body emphasis | Inter | 500 | none |
| Label / Caption | Inter | 400 | uppercase, letter-spacing 2-3px |
| Data (numbers) | Oswald | 700 | none |

Font scale (mobile):
- Display: 48-56px
- Heading: 20-28px
- Body: 13-15px
- Label: 9-11px
- Data: 22-28px

Load from Google Fonts: `Oswald:wght@500;700` and `Inter:wght@400;500`.

### Spacing & Layout

- Page padding: 24px horizontal
- Section gap: 24px vertical
- Grid cell gap: 1px (creates hairline dividers between cells)
- Card padding: 16-20px
- Border radius: 0px everywhere except bottom nav items (8px) and avatar (50%)
- Dividers: 1px solid `--surface-border`

### Touch Targets

- Minimum interactive element: 48px height
- CTA buttons: 56px height minimum
- Active workout buttons: 64px height (gym-friendly)
- Bottom nav items: 48px hit area

## Navigation

### Structure: 3-tab bottom bar

| Tab | Icon | Destination |
|---|---|---|
| Home | Home (Lucide) | `/` — Magazine cover, stats, quick actions |
| Train | Zap (Lucide) | `/new-workout` — Workout builder / programme continue |
| Coach | MessageSquare (Lucide) | `/coach` — AI chat |

### Bottom bar styling
- Background: `#0A0A0A` with 1px top border `#222222`
- Active tab: volt yellow icon + label
- Inactive tab: `#555555` icon + label
- Safe area padding for notched devices: `env(safe-area-inset-bottom)`
- Hidden on `/workout/active` route (unchanged from current)

### Secondary navigation
Accessed from Home screen quick-action row or contextual links:
- History (`/history`)
- Progress (`/progress`)
- Exercises (`/exercises`)
- Programme (`/programme/build`, `/programme/continue`)
- Profile (`/profile`)
- Account (`/account`)

## Screen-by-Screen Design

### Home (`/`)

**Layout: Magazine Cover**

1. **Top bar** — Date (label style, left) + Profile avatar (right, 32px circle with yellow ring)
2. **Hero headline** — Today's session name in Oswald 700, 52-56px, uppercase. If on a programme, show programme context as a label above. If no session planned, show "REST DAY" or motivational line.
3. **Stat strip** — 3-cell horizontal row, 1px gaps, `--surface-raised` background:
   - This week: `X/Y` (Oswald 700 data, Inter label)
   - Streak: number + "STREAK" label
   - Recovery: score + "RECOVERY" label (yellow if >80, white otherwise)
4. **CTA** — Full-width `--accent` background, 56px height, "START SESSION →" in Oswald 700 uppercase. If active workout exists, show "RESUME WORKOUT →" instead.
5. **Quick actions** — 3-cell row below CTA: History, Exercises, Programme. Bordered rectangles, no fill, Inter 10px uppercase labels.

**Conditional elements:**
- Active workout banner: replaces the CTA area with "IN PROGRESS" label + session name + resume button
- Deload suggestion: 1px yellow left-border card with text + dismiss X
- Recovery check-in: if not done today, show compact 4-button row above stat strip

### Onboarding (8 steps)

Each step is a full-screen view:

1. **Top**: Step counter "1 / 8" in Inter label style, top-right
2. **Question**: Oswald 700, 36-40px, uppercase. One question per screen.
3. **Options**: Bordered rectangles, 1px `--surface-border`. On selection: `--accent` fill with black text. No emoji — text labels only. Single-column stack.
4. **Text inputs**: Full-width, `--surface-raised` background, no border, 48px height, Inter 15px, white text. Yellow underline on focus.
5. **Continue button**: Full-width accent bar at bottom, fixed position. "CONTINUE →" in Oswald. Disabled state: `--surface-border` background with `--text-muted` text.
6. **Back**: "←" button top-left, only after step 1

### New Workout Builder (`/new-workout`)

5-step flow, same pattern as onboarding but with:

1. **Step indicator**: "2 / 5" top-right (no dots, no progress bar)
2. **Step title**: Oswald heading describing what to pick
3. **Options**: Same bordered-rectangle selection pattern. Yellow fill = selected.
4. **Duration step**: 6 bordered rectangles in a 3x2 grid, each showing "30 MIN" etc.
5. **Final step**: "GENERATE WORKOUT" CTA. Loading state: the heading text becomes "GENERATING..." with a simple yellow pulse animation on the CTA bar.

### Active Workout (`/workout/active`)

Designed for gym use — large touch targets, minimal UI, high contrast.

1. **Exercise name**: Oswald 700, 32-36px, uppercase, top of screen
2. **Muscle tags**: Row of bordered labels below name (Inter 9px, uppercase)
3. **Set grid**: Full-width data table
   - Columns: SET | REPS | KG | RIR
   - Header row: Inter 9px uppercase labels, `--text-muted`
   - Data rows: Oswald 700, 20px for numbers. Current set row highlighted with `--accent` left border.
   - Completed sets: `--text-muted` color, strikethrough optional
   - Input fields: 48px height, `--surface-raised` background, centered text
4. **Complete Set button**: Full-width accent bar, 64px height, "COMPLETE SET →"
5. **Rest timer**: When active, replaces the set grid area.
   - Countdown number: Oswald 700, 72px, centered, white
   - Label below: "REST" in Inter label style
   - "+15S" and "SKIP" buttons: bordered rectangles, side by side, 48px height
   - No circular SVG. Just a massive number counting down.
6. **Navigation**: Thin top bar with "← PREV" and "NEXT →" in Inter 11px, plus "X" to exit
7. **Exercise counter**: "3 / 6" label style, centered in top bar

### Progress (`/progress`)

Editorial data layout:

1. **Header**: "PROGRESS" in Oswald 700, 28px
2. **Stat cards**: 2x2 grid, 1px gaps
   - Total volume (Oswald data + Inter label)
   - Avg sets/week
   - Favourite lift
   - Bodyweight trend (with ↑/↓ indicator, yellow for positive)
3. **Charts** (Recharts):
   - Line chart: white line on black, yellow dots for data points, no grid lines, minimal axis labels
   - Bar chart: white bars, yellow highlight for current week
   - Custom theme: `{ axis: '#333', grid: 'none', line: '#fff', dot: '#E8FF00' }`
4. **Muscle heatmap**: Grayscale intensity (white = most trained, dark gray = least). No colors. Grid layout with muscle labels.
5. **PR list**: Table format — exercise name (Inter 13px), weight (Oswald 700), date (Inter label). Yellow accent on newest PRs.

### Coach (`/coach`)

Clean chat interface:

1. **Header**: "COACH" in Oswald 700, 24px
2. **Messages**:
   - User: right-aligned, `--surface-raised` background, Inter 14px, white text, 0px radius
   - AI: left-aligned, 3px `--accent` left border, no background fill, Inter 14px, `--text-secondary`
3. **Suggested prompts**: When chat is empty, show 3 bordered rectangles with prompt text. On tap, fill input.
4. **Input area**: Fixed bottom. `--surface-raised` background, Inter 14px. Send button: yellow Zap icon, 48px.

### Workout History (`/history`)

1. **Header**: "HISTORY" in Oswald 700, 28px
2. **Workout cards**: Stacked, separated by 1px borders
   - Date (Inter label, left) + Duration (Inter label, right)
   - Session name (Oswald 500, 18px, uppercase)
   - Exercise count + total volume (Inter 12px, `--text-muted`)
   - Expandable: tap to show exercise list with sets/reps/weight

### Exercise Library (`/exercises`)

1. **Header**: "EXERCISES" in Oswald 700, 28px
2. **Search**: Full-width input, `--surface-raised`, magnifying glass icon
3. **Filters**: Horizontal scrollable row of bordered chip buttons. Selected = yellow fill + black text.
4. **Exercise list**: Stacked rows, 1px borders
   - Exercise name (Inter 500, 15px)
   - Muscle groups (Inter label style)
   - Favourite star: yellow when active, `--text-muted` when not
5. **Exercise detail** (`/exercises/:slug`): Exercise name as Oswald heading, sections separated by 1px borders (instructions, form cues, common mistakes)

### Profile (`/profile`)

1. **Header**: "PROFILE" in Oswald 700, 28px
2. **Form sections**: Same selection pattern as onboarding (bordered rectangles, yellow fill on selected)
3. **Text inputs**: Same style as onboarding
4. **Save button**: Full-width accent bar
5. **Gym profiles**: Collapsible sections with equipment chip selectors
6. **Danger zone**: Red-bordered card at bottom with "RESET DATA" button (red fill)

### Auth Screens (Login, Register, etc.)

1. **Logo**: "POCKET TRAINER" in Oswald 700, 24px. No icon — pure text mark. Yellow dot after the text as a brand element.
2. **Form card**: `--surface-raised` background, 1px border, stacked inputs
3. **Inputs**: 48px height, `--surface-raised` or `--surface` background, 1px bottom border `--surface-border`, Inter 15px. Focus state: yellow bottom border.
4. **Primary CTA**: Full-width accent bar (same as everywhere)
5. **Secondary links**: Inter 13px, `--text-muted`, underline on hover/tap
6. **Password strength**: 5 horizontal bars, filling left to right. Colors: muted → red → orange → yellow → green
7. **Success states**: Yellow checkmark icon + Oswald heading

### Account Settings (`/account`)

1. **Header**: "ACCOUNT" + back arrow
2. **Tab navigation**: Horizontal scroll row of text labels. Active = yellow underline + white text. Inactive = `--text-muted`.
3. **Content sections**: Same form patterns as profile
4. **Sessions list**: Stacked rows with device label + IP + revoke button
5. **Danger zone tab**: Red-bordered section, password confirmation modal before delete

### Programme Builder (`/programme/build`)

Same step-by-step pattern as workout builder:
- Step counter top-right
- Oswald heading per step
- Bordered-rectangle option selection
- Split/day configuration as grid selectors
- Final review screen: summary card with programme details
- "CREATE PROGRAMME" accent CTA

## Animations

Keep minimal and functional:

| Animation | Usage | Duration |
|---|---|---|
| Fade in (opacity 0→1, translateY 8→0) | Screen transitions, new content | 200ms ease-out |
| Press (scale 0.97) | All tappable elements on :active | 100ms |
| Pulse (opacity 0.7→1) | Loading states, "GENERATING..." CTA | 1.5s ease-in-out loop |
| Slide up (translateY 100%→0) | Toast notifications | 250ms ease-out |
| Number tick | Rest timer countdown | Per-second, no easing |

No bounces. No celebrates. No shakes. Keep it tight and editorial.

## CSS Architecture

Replace the current CSS variables in `index.css` with the new design tokens. Remove all existing custom animation classes except what's listed above. Remove glassmorphism, glow, and skeleton utilities.

Tailwind continues as the utility framework. Custom CSS limited to:
- Design token variables (`:root`)
- Animation keyframes
- Font imports
- Scrollbar styling (keep dark)

## Files to Modify

### Core styling
- `src/index.css` — Replace design tokens, animations, utility classes

### Design system
- `src/styles/designSystem.js` — Update all color, font, spacing, radius values

### Layout & navigation
- `src/App.jsx` — Update routing if needed for Train tab
- `src/components/BottomBar.jsx` — Restyle to 3 tabs (Home, Train, Coach)
- `src/components/ScreenHeader.jsx` — Restyle with Oswald + monochrome

### All screen files
Every screen component needs visual updates to match the new design tokens, typography, spacing, and interaction patterns. The structure and logic remain the same — this is a visual reskin, not a feature change.

Key screens (highest impact):
1. Home screen — Magazine cover layout redesign
2. Active workout — Large touch targets, simplified rest timer
3. Onboarding — Full-screen steps, bordered-rectangle options
4. New workout builder — Consistent step pattern
5. Auth screens — Text-mark logo, editorial form styling

Secondary screens:
6. Progress — Editorial data layout, chart theming
7. Coach — Yellow accent bar messages
8. History — Stacked border layout
9. Exercises — Filter chips, stacked rows
10. Profile — Consistent form patterns
11. Account — Tab styling
12. Programme builder — Step pattern consistency

## What Does NOT Change

- Routing structure (except bottom nav tab destinations)
- Authentication flow and logic
- API calls and data models
- State management
- Feature functionality
- Backend/server code

This is purely a visual layer redesign. All business logic, data flows, and feature behavior remain identical.
