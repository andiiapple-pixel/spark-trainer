# Editorial UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the entire Pocket Trainer app from dark-navy/orange to a monochrome editorial sport aesthetic with Oswald + Inter typography and volt yellow (`#E8FF00`) accent.

**Architecture:** This is a visual-only redesign — no feature, routing, or logic changes. Work proceeds foundation-up: design tokens first, then shared components, then screens in priority order. Each task produces a visually self-contained commit.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Lucide React, Recharts

**Spec:** `docs/superpowers/specs/2026-03-28-editorial-ui-redesign-design.md`

---

### Task 1: Design Tokens — CSS Variables & Fonts

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace font import**

Replace the Barlow/Barlow Condensed import at line 1 with:
```css
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500&display=swap');
```

- [ ] **Step 2: Replace all CSS variables in `:root`**

Replace the `:root` block (lines 4-33) with:
```css
:root {
  --surface:           #0A0A0A;
  --surface-raised:    #111111;
  --surface-border:    #222222;

  --text-primary:      #FFFFFF;
  --text-secondary:    #888888;
  --text-muted:        #555555;

  --accent:            #E8FF00;
  --accent-on:         #000000;

  --success:           #22C55E;
  --error:             #EF4444;
  --warning:           #F59E0B;
  --info:              #3B82F6;
}
```

- [ ] **Step 3: Update body styles**

Replace the `body` block (lines 40-50) with:
```css
body {
  background-color: var(--surface);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Replace scrollbar styles**

```css
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: var(--surface); }
::-webkit-scrollbar-thumb { background: var(--surface-border); border-radius: 2px; }
```

- [ ] **Step 5: Replace all animations with editorial set**

Remove all existing `@keyframes` (lines 65-111) and animation utility classes (lines 114-121). Replace with:
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.7; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(100%); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-fade-in  { animation: fadeIn 0.2s ease-out forwards; }
.animate-pulse    { animation: pulse 1.5s ease-in-out infinite; }
.animate-slide-up { animation: slideUp 0.25s ease-out forwards; }
.animate-spin     { animation: spin 1s linear infinite; }
```

- [ ] **Step 6: Replace utility classes**

Remove everything from `.btn-press` through the end of file (lines 123-205). Replace with:
```css
/* Press feedback */
.btn-press {
  transition: transform 0.1s ease;
  cursor: pointer;
}
.btn-press:active {
  transform: scale(0.97);
}

/* Prevent iOS zoom on inputs */
input, textarea, select {
  font-size: 16px;
}

/* Typography helpers */
.font-display { font-family: 'Oswald', sans-serif; }
.font-body    { font-family: 'Inter', sans-serif; }

/* Focus ring */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Verify app loads**

Run: `cd /Users/andrewthornton/ai-personal-trainer && npm run dev`

Open in browser. The app will look broken (colors wrong, fonts different) — that's expected. Verify it loads without errors in the console.

- [ ] **Step 8: Commit**

```bash
git add src/index.css
git commit -m "feat(design): replace CSS tokens with editorial monochrome palette"
```

---

### Task 2: Design System JS Tokens

**Files:**
- Modify: `src/styles/designSystem.js`

- [ ] **Step 1: Replace entire file contents**

```js
// Pocket Trainer Design System — Editorial Sport
export const colors = {
  bg: {
    primary:   '#0A0A0A',
    raised:    '#111111',
    border:    '#222222',
  },
  accent: {
    primary:   '#E8FF00',
    on:        '#000000',
    success:   '#22C55E',
    warning:   '#F59E0B',
    danger:    '#EF4444',
    info:      '#3B82F6',
  },
  text: {
    primary:   '#FFFFFF',
    secondary: '#888888',
    muted:     '#555555',
    inverse:   '#000000',
  },
  border: {
    subtle:  '#1A1A1A',
    default: '#222222',
    strong:  '#333333',
  },
};

export const fonts = {
  display: "'Oswald', sans-serif",
  body:    "'Inter', sans-serif",
};

export const radius = {
  none: '0px',
  sm:   '8px',
  full: '9999px',
};

export const spacing = {
  screenPadding: '24px',
  cardPadding:   '16px',
  cellGap:       '1px',
  sectionGap:    '24px',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/designSystem.js
git commit -m "feat(design): update designSystem.js to editorial tokens"
```

---

### Task 3: Bottom Navigation Bar

**Files:**
- Modify: `src/components/shared/BottomBar.jsx`

- [ ] **Step 1: Replace the entire BottomBar component**

```jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Zap, MessageSquare } from 'lucide-react';

export default function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/new-workout', icon: Zap, label: 'Train' },
    { path: '/coach', icon: MessageSquare, label: 'Coach' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          background: '#0A0A0A',
          borderTop: '1px solid #222222',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '12px 16px',
          }}
        >
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="btn-press"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'transparent',
                  color: active ? '#E8FF00' : '#555555',
                  borderRadius: 8,
                  paddingLeft: 16,
                  paddingRight: 16,
                  paddingTop: 6,
                  paddingBottom: 6,
                  fontWeight: 500,
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontFamily: "'Inter', sans-serif",
                  gap: 4,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify nav renders correctly**

Run dev server, check bottom bar shows 3 tabs: Home, Train, Coach. Yellow on active, gray on inactive. No glassmorphism, no rounded top corners.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/BottomBar.jsx
git commit -m "feat(design): restyle BottomBar to editorial 3-tab nav"
```

---

### Task 4: Screen Header

**Files:**
- Modify: `src/components/shared/ScreenHeader.jsx`

- [ ] **Step 1: Replace the entire ScreenHeader component**

```jsx
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ScreenHeader({ title, onBack, progress = null, hideBack = false, right = null }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div style={{ background: '#0A0A0A' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 24px 12px',
        }}
      >
        {!hideBack && (
          <button
            onClick={handleBack}
            className="btn-press"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              background: 'transparent',
              color: '#888888',
              border: '1px solid #222222',
              borderRadius: 0,
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {title && (
          <h2
            style={{
              flex: 1,
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "'Oswald', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              textAlign: hideBack && !right ? 'center' : 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            {title}
          </h2>
        )}
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      {progress !== null && (
        <div style={{ height: 2, background: '#222222' }}>
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: '#E8FF00',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/ScreenHeader.jsx
git commit -m "feat(design): restyle ScreenHeader to editorial look"
```

---

### Task 5: App Shell & Page Loader

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update PageLoader component**

Replace the `PageLoader` function (lines 34-40) with:
```jsx
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#0A0A0A' }}>
      <div className="w-6 h-6 border-2 border-t-transparent animate-spin" style={{ borderColor: '#222222', borderTopColor: '#E8FF00' }} />
    </div>
  );
}
```

- [ ] **Step 2: Update Layout background**

In the `Layout` function (line 46), change:
```jsx
<div className="flex flex-col min-h-screen" style={{ background: '#0e0e0e' }}>
```
to:
```jsx
<div className="flex flex-col min-h-screen" style={{ background: '#0A0A0A' }}>
```

- [ ] **Step 3: Update AppShell onboarding wrapper background**

In `AppShell` (line 80), change:
```jsx
<div style={{ background: '#0e0e0e', minHeight: '100vh' }}>
```
to:
```jsx
<div style={{ background: '#0A0A0A', minHeight: '100vh' }}>
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat(design): update App shell backgrounds and loader to editorial"
```

---

### Task 6: Home Screen — Magazine Cover Layout

**Files:**
- Modify: `src/components/home/Home.jsx`

This is the biggest single task. Replace all inline styles and layout structure to match the magazine-cover design.

- [ ] **Step 1: Update imports**

At the top of the file, keep all existing imports but note the icon changes later. No import changes needed — `Flame`, `Zap`, `ChevronRight`, `X`, `RefreshCw`, `Dumbbell`, `BookOpen`, `History`, `User` are all still used.

- [ ] **Step 2: Replace the return JSX**

Replace the entire `return (...)` block (lines 139-461) with the editorial magazine-cover layout. Key changes:

- Background: `#0A0A0A` instead of `#0D1117`
- All `fontFamily` references: `'Oswald'` for display, `'Inter'` for body
- Greeting label: Inter 10px, uppercase, letter-spacing 3px, color `#555555`
- Name heading: Oswald 700, 52px, uppercase, color `#FFFFFF`
- Daily message: Inter 13px, color `#888888`
- Streak badge: `#0A0A0A` bg, no border-radius, `#E8FF00` text for number
- Stat strip: 3 cells with `background: '#111111'`, `gap: '1px'` between them (use a parent with `gap: 1, background: '#222222'` to create 1px dividers), no border-radius
- Stat values: Oswald 700, 24px. First stat (`weeklyCount`) in `#E8FF00`, others in `#FFFFFF`
- Stat labels: Inter 9px, uppercase, letter-spacing 2px, color `#555555`
- Week progress bar: 3px height, `#111111` track, `#E8FF00` fill, no border-radius
- CTA button: `background: '#E8FF00'`, `color: '#000000'`, Oswald 700, 15px, uppercase, letter-spacing 3px, 56px height, no border-radius, full width. Text: "START SESSION →"
- Active workout banner: `background: '#E8FF00'`, black text, no border-radius. "IN PROGRESS" label, session name in Oswald 700 28px black, "RESUME WORKOUT →" button in black border on yellow
- Programme card: `background: '#111111'`, 1px border `#222222`, no border-radius. Yellow left border for accent
- Deload card: 3px left border `#E8FF00`, no background fill, otherwise same pattern
- Quick actions: 3-cell row (not 2x2 grid), `border: '1px solid #222222'`, no background fill, no border-radius. Labels: Inter 10px uppercase, color `#888888`. Change to 3 items: History, Exercises, Programme
- Recovery check-in: keep compact component, it will be restyled in its own task

```jsx
return (
  <div
    className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24"
    style={{ background: '#0A0A0A' }}
  >
    {/* Top bar */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '48px 24px 0' }}>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 3, color: '#555555', textTransform: 'uppercase' }}>
        {new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
      </span>
      <button
        onClick={() => navigate('/profile')}
        className="btn-press"
        style={{
          width: 32, height: 32, borderRadius: '50%', border: '2px solid #222222',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E8FF00' }} />
      </button>
    </div>

    {/* Hero headline */}
    <div style={{ padding: '24px 24px 0' }}>
      {programme && nextProg && (
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 3, color: '#555555', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Week {programme.currentWeek || 1} · {programme.name}
        </span>
      )}
      <h1 style={{
        fontFamily: "'Oswald', sans-serif",
        fontSize: 52,
        fontWeight: 700,
        color: '#FFFFFF',
        lineHeight: 0.9,
        textTransform: 'uppercase',
        margin: 0,
      }}>
        {hasActiveWorkout
          ? (activeWkt?.session_name || activeWkt?.sessionConfig?.focus || 'Workout')
          : programme && nextProg
            ? nextProg.dayName
            : (profile?.name || 'Athlete')}
      </h1>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888888', marginTop: 12, lineHeight: 1.5 }}>
        {dailyMessage || motivational}
      </p>
    </div>

    {/* Stat strip */}
    <div style={{ padding: '24px 24px 0' }}>
      <div style={{ display: 'flex', gap: 1, background: '#222222' }}>
        {[
          { value: `${weeklyCount}/${goalDays}`, label: 'THIS WEEK', highlight: true },
          { value: streak > 0 ? streak : '0', label: 'STREAK' },
          { value: (() => { const r = storage.getRecoveryLogs?.(); const today = r?.[0]; return today?.score ?? '—'; })(), label: 'RECOVERY' },
        ].map(({ value, label, highlight }) => (
          <div
            key={label}
            style={{
              flex: 1, background: '#111111', padding: '16px 12px', textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, fontWeight: 700, color: highlight ? '#E8FF00' : '#FFFFFF' }}>
              {value}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: 2, color: '#555555', textTransform: 'uppercase', marginTop: 4 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Week progress */}
      <div style={{ marginTop: 12 }}>
        <div style={{ background: '#111111', height: 3 }}>
          <div style={{ width: `${weekProgress * 100}%`, height: '100%', background: '#E8FF00', transition: 'width 0.6s ease' }} />
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#555555', marginTop: 6 }}>
          {weeklyCount >= goalDays ? 'Weekly goal reached' : `${goalDays - weeklyCount} session${goalDays - weeklyCount !== 1 ? 's' : ''} to go`}
        </p>
      </div>
    </div>

    {/* Recovery check-in */}
    <div style={{ padding: '16px 24px 0' }}>
      <RecoveryCheckin compact />
    </div>

    {/* Deload suggestion */}
    {deloadMsg && (
      <div style={{ padding: '12px 24px 0' }}>
        <div
          className="animate-fade-in"
          style={{ borderLeft: '3px solid #E8FF00', padding: '12px 16px', display: 'flex', alignItems: 'start', gap: 12 }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 2, color: '#E8FF00', textTransform: 'uppercase', marginBottom: 4 }}>
              Deload Suggestion
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#888888', lineHeight: 1.5 }}>{deloadMsg}</p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('spark_deload_dismissed', new Date().toDateString());
              setDeloadDismissed(true);
            }}
            className="btn-press"
            style={{ color: '#555555', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )}

    {/* Active workout banner */}
    {hasActiveWorkout && (
      <div style={{ padding: '16px 24px 0' }}>
        <div className="animate-fade-in" style={{ background: '#E8FF00', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#000000' }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, color: '#000000', letterSpacing: 2, textTransform: 'uppercase' }}>
              {activeStatus === 'in_progress' ? 'In Progress' : 'Workout Ready'}
            </span>
          </div>
          <div style={{
            fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: '#000000',
            lineHeight: 0.95, textTransform: 'uppercase', marginBottom: 8,
          }}>
            {activeWkt?.session_name || activeWkt?.sessionConfig?.focus || 'Your workout'}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(0,0,0,0.5)', marginBottom: 16 }}>
            {activeStatus === 'in_progress'
              ? `Exercise ${ctx.currentExerciseIndex + 1} of ${activeWkt?.exercises?.length ?? '?'}`
              : `${activeWkt?.exercises?.length ?? '?'} exercises · ${activeWkt?.estimated_duration_mins ?? '?'} min`}
          </div>
          <button
            onClick={resumeActiveWorkout}
            className="btn-press"
            style={{
              background: 'transparent', color: '#000000',
              border: '2px solid #000000', padding: '12px 24px',
              fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 13,
              letterSpacing: 2, textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {activeStatus === 'in_progress' ? 'Resume Workout →' : 'View Workout →'}
          </button>
        </div>
      </div>
    )}

    {/* Programme card */}
    {programme && nextProg && !hasActiveWorkout && (
      <div style={{ padding: '16px 24px 0' }}>
        <div className="animate-fade-in" style={{ borderLeft: '3px solid #E8FF00', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 2, color: '#E8FF00', textTransform: 'uppercase', marginBottom: 4 }}>
                Programme — {programme.name}
              </div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                Next: {nextProg.dayName}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#888888', marginTop: 4 }}>{nextProg.statusMsg}</div>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#555555', letterSpacing: 2, textTransform: 'uppercase' }}>
              Wk {programme.currentWeek || 1}/{programme.weeks}
            </div>
          </div>
          <button
            onClick={() => navigate('/programme/continue')}
            className="btn-press"
            style={{
              width: '100%', marginTop: 16, padding: '14px',
              background: '#E8FF00', color: '#000000',
              fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 13,
              letterSpacing: 2, textTransform: 'uppercase',
              border: 'none', cursor: 'pointer',
            }}
          >
            Generate Today's Session →
          </button>
        </div>
      </div>
    )}

    {/* Primary CTA */}
    {!hasActiveWorkout && (
      <div style={{ padding: '24px 24px 0' }}>
        <button
          onClick={startNewWorkout}
          className="btn-press"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: '#E8FF00', color: '#000000',
            fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 15,
            letterSpacing: 3, textTransform: 'uppercase',
            padding: '18px 24px', border: 'none', cursor: 'pointer',
          }}
        >
          <Zap size={20} />
          Start Session →
        </button>
      </div>
    )}

    {/* Quick actions */}
    <div style={{ padding: '24px 24px 0' }}>
      <div style={{ display: 'flex', gap: 1, background: '#222222' }}>
        {[
          { label: 'History', onClick: () => navigate('/history') },
          { label: 'Exercises', onClick: () => navigate('/exercises') },
          { label: 'Programme', onClick: () => navigate('/programme/build') },
        ].map(({ label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="btn-press"
            style={{
              flex: 1, background: '#0A0A0A', padding: '14px 8px',
              border: 'none', cursor: 'pointer', textAlign: 'center',
            }}
          >
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 2, color: '#888888', textTransform: 'uppercase' }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);
```

- [ ] **Step 3: Verify home screen renders**

Open the app, check the home screen matches the magazine cover layout: giant headline, stat strip with 1px gaps, yellow CTA, 3-cell quick actions.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/Home.jsx
git commit -m "feat(design): redesign Home screen to magazine-cover layout"
```

---

### Task 7: Auth Screens — Login

**Files:**
- Modify: `src/screens/LoginScreen.jsx`

- [ ] **Step 1: Read the current file**

Read `src/screens/LoginScreen.jsx` to understand structure and state management.

- [ ] **Step 2: Restyle the component**

Apply editorial styling. Key changes:
- Background: `#0A0A0A`
- Logo: Replace icon-based logo with text mark: `<span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 2 }}>Pocket Trainer<span style={{ color: '#E8FF00' }}>.</span></span>`
- Form card: `background: '#111111'`, `border: '1px solid #222222'`, no border-radius
- Inputs: 48px height, `background: '#0A0A0A'`, 1px bottom border `#222222`, Inter 15px, white text. Focus: yellow bottom border
- CTA button: Full-width `#E8FF00` background, black text, Oswald 700, uppercase, no border-radius
- Links: Inter 13px, `#555555`, underline
- Error states: `#EF4444` text, same flat styling

- [ ] **Step 3: Verify login renders and functions**

- [ ] **Step 4: Commit**

```bash
git add src/screens/LoginScreen.jsx
git commit -m "feat(design): restyle LoginScreen to editorial"
```

---

### Task 8: Auth Screens — Register

**Files:**
- Modify: `src/screens/RegisterScreen.jsx`

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Restyle with same patterns as LoginScreen**

Same text-mark logo, same input styling, same CTA. Additional:
- Password strength bar: 5 horizontal segments, filling left to right. Colors progress from `#222222` → `#EF4444` → `#F59E0B` → `#E8FF00` → `#22C55E`
- Validation checklist: Inter 11px, `#555555` for incomplete, `#22C55E` for complete
- Success state: Yellow check icon + Oswald heading

- [ ] **Step 3: Commit**

```bash
git add src/screens/RegisterScreen.jsx
git commit -m "feat(design): restyle RegisterScreen to editorial"
```

---

### Task 9: Auth Screens — Verify Email, Forgot Password, Reset Password

**Files:**
- Modify: `src/screens/VerifyEmailScreen.jsx`
- Modify: `src/screens/ForgotPasswordScreen.jsx`
- Modify: `src/screens/ResetPasswordScreen.jsx`

- [ ] **Step 1: Read all three files**

- [ ] **Step 2: Restyle each with editorial patterns**

Same background, logo, input, and CTA patterns established in Tasks 7-8. These are simpler screens — mostly form + status message.

- [ ] **Step 3: Commit**

```bash
git add src/screens/VerifyEmailScreen.jsx src/screens/ForgotPasswordScreen.jsx src/screens/ResetPasswordScreen.jsx
git commit -m "feat(design): restyle remaining auth screens to editorial"
```

---

### Task 10: Onboarding Flow

**Files:**
- Modify: `src/components/onboarding/Onboarding.jsx`

- [ ] **Step 1: Read the current file**

Read `src/components/onboarding/Onboarding.jsx` fully.

- [ ] **Step 2: Restyle the component**

Key changes:
- Background: `#0A0A0A`
- Step counter: Top-right, Inter 10px, `#555555`, format "1 / 8"
- Back button: Top-left, "←" in a bordered square (same as ScreenHeader)
- Question heading: Oswald 700, 36px, uppercase, white
- Option cards: Replace emoji-based OptionCard with bordered rectangles. `border: '1px solid #222222'`, no border-radius, no background. Selected state: `background: '#E8FF00'`, `color: '#000000'`, `border-color: '#E8FF00'`. Text labels only — remove emoji from option labels.
- Chip toggles (injuries, diet): Same bordered-rectangle pattern but smaller. Selected: yellow fill + black text.
- Text inputs: 48px height, `#111111` background, no border-radius, Inter 15px. Focus: yellow bottom border.
- Number inputs: Same as text inputs
- Continue button: Fixed at bottom, full-width, `#E8FF00` background, Oswald 700, "CONTINUE →". Disabled: `#222222` background, `#555555` text.
- Remove all emoji from option labels — text only
- Remove progress bar, replace with step counter "X / 8"

- [ ] **Step 3: Verify each onboarding step renders and selections work**

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/Onboarding.jsx
git commit -m "feat(design): restyle Onboarding to editorial full-screen steps"
```

---

### Task 11: New Workout Builder

**Files:**
- Modify: `src/components/flows/new-workout/NewWorkout.jsx`
- Modify: `src/components/flows/new-workout/WorkoutDisplay.jsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Restyle NewWorkout.jsx**

Same patterns as Onboarding:
- Step counter "2 / 5" top-right (not progress dots)
- Oswald heading per step
- Bordered-rectangle option selection (yellow fill = selected)
- Duration options: 3x2 grid of bordered rectangles showing "30 MIN" etc.
- Remove emoji from option labels
- CTA: Yellow bar, "CONTINUE →" / "GENERATE WORKOUT" on last step
- Loading state: heading becomes "GENERATING..." with yellow `.animate-pulse` on CTA bar

- [ ] **Step 3: Restyle WorkoutDisplay.jsx**

- Exercise list: stacked rows with 1px borders, Oswald exercise names, Inter set/rep details
- Start button: full-width yellow CTA
- Regenerate button: bordered rectangle, not filled

- [ ] **Step 4: Verify full workout creation flow works**

- [ ] **Step 5: Commit**

```bash
git add src/components/flows/new-workout/NewWorkout.jsx src/components/flows/new-workout/WorkoutDisplay.jsx
git commit -m "feat(design): restyle workout builder to editorial"
```

---

### Task 12: Active Workout Screen

**Files:**
- Modify: `src/components/flows/active-workout/ActiveWorkout.jsx`
- Modify: `src/components/flows/active-workout/EndOfWorkout.jsx`

This is the largest file (~10,600 lines). Focus on styling changes only — do not restructure logic.

- [ ] **Step 1: Read the file to understand the component structure**

Read `src/components/flows/active-workout/ActiveWorkout.jsx` in sections (it's very large).

- [ ] **Step 2: Restyle exercise display area**

- Exercise name: Oswald 700, 32px, uppercase, white
- Muscle tags: bordered labels, Inter 9px, uppercase, `#555555` text, `#222222` border
- Background: `#0A0A0A` everywhere

- [ ] **Step 3: Restyle set logging grid**

- Column headers: Inter 9px, uppercase, `#555555`
- Data cells: Oswald 700, 20px, white
- Current set row: 3px left border `#E8FF00`
- Input fields: 48px height, `#111111` background, centered text, no border-radius
- Complete Set button: full-width `#E8FF00`, 64px height, Oswald 700, "COMPLETE SET →"

- [ ] **Step 4: Restyle rest timer**

Replace circular SVG timer with simple large number:
- Countdown: Oswald 700, 72px, white, centered
- "REST" label below: Inter 9px, uppercase, `#555555`
- "+15S" and "SKIP" buttons: side by side bordered rectangles, 48px height
- Remove all circular SVG rendering for the timer

- [ ] **Step 5: Restyle navigation**

- Top bar: "← PREV" and "NEXT →" in Inter 11px, `#888888`
- Exercise counter: "3 / 6" center, Inter 10px, `#555555`
- Exit button: "X" in bordered square

- [ ] **Step 6: Restyle EndOfWorkout.jsx**

- Rating: bordered rectangles for 1-5 (selected = yellow fill)
- Feedback text: Inter 14px, `#888888`
- Save button: full-width yellow CTA

- [ ] **Step 7: Verify full workout flow works**

Start a workout, log sets, check rest timer, complete workout, verify end-of-workout modal.

- [ ] **Step 8: Commit**

```bash
git add src/components/flows/active-workout/ActiveWorkout.jsx src/components/flows/active-workout/EndOfWorkout.jsx
git commit -m "feat(design): restyle active workout to editorial with simplified timer"
```

---

### Task 13: Progress Screen

**Files:**
- Modify: `src/components/progress/Progress.jsx`

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Restyle to editorial data layout**

- Header: Oswald 700, 28px, "PROGRESS"
- Stat cards: 2x2 grid, 1px gaps (same pattern as home stat strip)
- Stat values: Oswald 700, data size. Yellow for positive trends.
- Charts (Recharts): white lines on black, no grid lines, yellow dots for data points, minimal axis labels in Inter 9px `#555555`
- Muscle heatmap: grayscale intensity (white = most, dark gray = least), no colors
- PR table: stacked rows with 1px borders, Oswald for weights, Inter for exercise names

- [ ] **Step 3: Commit**

```bash
git add src/components/progress/Progress.jsx
git commit -m "feat(design): restyle Progress to editorial data layout"
```

---

### Task 14: Coach Chat

**Files:**
- Modify: `src/components/coach/Coach.jsx`

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Restyle chat interface**

- Header: Oswald 700, 24px, "COACH"
- User messages: right-aligned, `#111111` background, Inter 14px, no border-radius
- AI messages: left-aligned, 3px `#E8FF00` left border, no background, Inter 14px, `#888888`
- Suggested prompts: bordered rectangles, Inter 13px
- Input: fixed bottom, `#111111` background, Inter 14px. Send button: Zap icon in `#E8FF00`, 48px

- [ ] **Step 3: Commit**

```bash
git add src/components/coach/Coach.jsx
git commit -m "feat(design): restyle Coach chat to editorial"
```

---

### Task 15: Workout History

**Files:**
- Modify: `src/components/flows/history/WorkoutHistory.jsx`

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Restyle to stacked border layout**

- Header: Oswald 700, 28px, "HISTORY"
- Workout cards: stacked, separated by 1px `#222222` borders. No border-radius, no card backgrounds.
- Date + duration: Inter 10px, `#555555`, uppercase
- Session name: Oswald 500, 18px, uppercase, white
- Details: Inter 12px, `#555555`

- [ ] **Step 3: Commit**

```bash
git add src/components/flows/history/WorkoutHistory.jsx
git commit -m "feat(design): restyle History to editorial stacked layout"
```

---

### Task 16: Exercise Library & Detail

**Files:**
- Modify: `src/components/exercises/ExerciseLibrary.jsx`
- Modify: `src/components/exercises/ExerciseDetail.jsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Restyle ExerciseLibrary**

- Header: Oswald 700, 28px, "EXERCISES"
- Search: full-width, `#111111` background, no border-radius
- Filter chips: horizontal scroll, bordered rectangles. Selected = `#E8FF00` fill + black text.
- Exercise list: stacked rows with 1px borders. Inter 500 15px for names, Inter label for muscle groups.
- Favourite star: `#E8FF00` when active, `#555555` when not

- [ ] **Step 3: Restyle ExerciseDetail**

- Exercise name: Oswald 700, 28px, uppercase
- Sections separated by 1px borders
- Body text: Inter 14px, `#888888`

- [ ] **Step 4: Commit**

```bash
git add src/components/exercises/ExerciseLibrary.jsx src/components/exercises/ExerciseDetail.jsx
git commit -m "feat(design): restyle exercise screens to editorial"
```

---

### Task 17: Profile Screen

**Files:**
- Modify: `src/components/home/Profile.jsx`

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Restyle with editorial form patterns**

- Header: Oswald 700, 28px, "PROFILE"
- Form sections: same bordered-rectangle selection as onboarding
- Text inputs: same editorial input styling
- Save button: full-width `#E8FF00` CTA
- Gym profiles: collapsible with 1px border sections
- Reset data button: `border: '1px solid #EF4444'`, `color: '#EF4444'`, no fill

- [ ] **Step 3: Commit**

```bash
git add src/components/home/Profile.jsx
git commit -m "feat(design): restyle Profile to editorial"
```

---

### Task 18: Account Settings

**Files:**
- Modify: `src/screens/AccountSettingsScreen.jsx`

- [ ] **Step 1: Read the current file**

- [ ] **Step 2: Restyle**

- Header: Oswald 700, 24px, "ACCOUNT"
- Tab navigation: horizontal scroll, text labels. Active: `#E8FF00` underline + white text. Inactive: `#555555`.
- Form patterns: same as Profile
- Sessions list: stacked rows with device info
- Danger zone: `border: '1px solid #EF4444'` section, red-themed delete button

- [ ] **Step 3: Commit**

```bash
git add src/screens/AccountSettingsScreen.jsx
git commit -m "feat(design): restyle AccountSettings to editorial"
```

---

### Task 19: Recovery Check-in & Programme Screens

**Files:**
- Modify: `src/components/recovery/RecoveryCheckin.jsx`
- Modify: `src/components/flows/programme/BuildProgramme.jsx`
- Modify: `src/components/flows/programme/ContinueProgramme.jsx`

- [ ] **Step 1: Read all three files**

- [ ] **Step 2: Restyle RecoveryCheckin**

- Compact mode: 4 bordered-rectangle buttons in a row, Inter labels, yellow selected state
- Full mode: same pattern, larger touch targets
- Score display: Oswald 700 for the number, yellow when high

- [ ] **Step 3: Restyle BuildProgramme**

Same step-by-step pattern as workout builder: step counter, Oswald headings, bordered-rectangle selections, yellow CTA.

- [ ] **Step 4: Restyle ContinueProgramme**

- Programme name: Oswald 700
- Next day info: bordered card with yellow accent
- Generate button: full-width yellow CTA

- [ ] **Step 5: Commit**

```bash
git add src/components/recovery/RecoveryCheckin.jsx src/components/flows/programme/BuildProgramme.jsx src/components/flows/programme/ContinueProgramme.jsx
git commit -m "feat(design): restyle recovery and programme screens to editorial"
```

---

### Task 20: Loading & Error States

**Files:**
- Modify: `src/components/shared/LoadingState.jsx`
- Modify: `src/components/shared/ErrorState.jsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Restyle LoadingState**

- Spinner: 24px, `#222222` border, `#E8FF00` top border, no border-radius on the track
- Text: Inter 12px, `#555555`, uppercase

- [ ] **Step 3: Restyle ErrorState**

- Error icon: `#EF4444`
- Message: Inter 14px, `#888888`
- Retry button: bordered rectangle, Inter 12px, uppercase

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/LoadingState.jsx src/components/shared/ErrorState.jsx
git commit -m "feat(design): restyle loading and error states to editorial"
```

---

### Task 21: Final Sweep & Verification

- [ ] **Step 1: Search for old color references**

Run grep across `src/` for old colors that may have been missed:
```bash
grep -rn '#0D1117\|#1C2430\|#F97316\|#FB923C\|#334155\|#94A3B8\|#64748B\|Barlow' src/ --include='*.jsx' --include='*.js' --include='*.css'
```

Fix any remaining references to old design tokens.

- [ ] **Step 2: Verify all screens visually**

Navigate through every screen in the app:
1. Login → Register → back to Login
2. Login → Home
3. Home → Profile → back
4. Home → New Workout → complete flow
5. Active Workout → Rest Timer → End of Workout
6. Progress screen
7. Coach chat
8. Exercise Library → Exercise Detail
9. History
10. Account Settings (all tabs)

- [ ] **Step 3: Test mobile viewport**

Open Chrome DevTools, test at 390px width (iPhone 14). Verify:
- All text is readable
- Touch targets are >= 48px
- No horizontal overflow
- Bottom nav has safe-area padding
- Active workout buttons are large enough for gym use

- [ ] **Step 4: Fix any issues found**

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "feat(design): final sweep — fix remaining old design references"
```
