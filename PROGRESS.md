# UI Progress Ledger (No-Run)

## Overview
This file tracks the “100x UI” redesign progress without requiring you to run the app.

## Checklist by Phase

### Phase 0 — Navigation + Reanimated + Layout Interference
- [x] Missing stack routes added: `AddHabit`, `QuitSettings`, `Savings`, `HealthTimeline`
- [x] `babel.config.js` added for `react-native-reanimated` plugin
- [x] Removed/replaced unsupported `gap:` style usage (static `rg` check)

### Phase 1 — Design System Foundation
- [x] Token-based theming added to `contexts/ThemeContext.tsx`
- [x] Theme tokens added: `lib/theme/tokens.ts`
- [x] UI primitives added:
  - `components/ui/Screen.tsx`
  - `components/ui/Card.tsx`
  - `components/ui/Button.tsx`
  - `components/ui/PrimaryButton.tsx`
  - `components/ui/IconButton.tsx`
  - `components/ui/SectionHeader.tsx`
  - `components/ui/Chip.tsx`
  - `components/ui/TextField.tsx`
  - `components/ui/ProgressBar.tsx`
- [x] First-pass refactor applied on `screens/HomeScreen.tsx` (progress + section headers)

### Phase 2 — Refactor Screens to Use Tokens/Consistent Styling
- [x] Token color refactor applied to:
  - `screens/HomeScreen.tsx`
  - `screens/HabitsScreen.tsx`
  - `screens/StatsScreen.tsx`
  - `screens/HabitDetailScreen.tsx`
  - `screens/AchievementsScreen.tsx`
  - `screens/SettingsScreen.tsx`
  - `screens/OnboardingScreen.tsx`
  - `screens/QuitOnboardingScreen.tsx`
  - `screens/QuitDashboardScreen.tsx`
  - `screens/CravingsLogScreen.tsx`
  - `components/SensorTracker.tsx`

### Phase 3 — UI Polish + Skeletons
- [x] Gradient glows added (Home metrics):
  - `components/ui/GradientFill.tsx`
  - `screens/HomeScreen.tsx`
- [x] Skeleton loading states added:
  - `screens/StatsScreen.tsx`
  - `screens/HabitDetailScreen.tsx`
  - `screens/QuitDashboardScreen.tsx`
- [x] Chart readability improved by aligning chart config colors with theme tokens
- [x] Unified press feedback on key actions (activeOpacity updates)

### Phase 4 — Verification + Tracking (Current)
- [x] Create `docs/ui-audit.md` (done in this change set)
- [x] Add static verification script: `npm run typecheck`
- [x] `npx tsc --noEmit` passes locally
- [x] Add screenshot regression workflow (documented for later)

## What Changed (High Signal)
- Navigation no longer points to missing screens.
- Dark/light styling is tokenized (centralized palette).
- Repeated UI patterns are reusable via primitives.
- UI polish: gradient glow + skeleton placeholders to reduce “blank/flash” loading.

## No-Run Verification Loop
Run these commands after each round of UI edits:
1. `npm run typecheck`
2. `rg "\\bgap\\s*:\\s*\\d+"`
3. `rg "navigation\\.navigate\\(['\\\"]" screens/` (sanity check destinations)

