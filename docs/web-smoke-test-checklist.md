# Web Smoke Test Checklist

Use this checklist to validate the app quickly on web while mobile Expo Go is unstable.

## Setup

1. Run:
   - `npx expo start --web`
2. Open the web URL (usually `http://localhost:19006`).
3. Keep browser devtools open (Console + Network).

## Global Sanity

- [ ] App loads without red error screen.
- [ ] No fatal errors in browser console.
- [ ] Light/dark mode toggle works in `Settings`.
- [ ] Bottom tab navigation works for all tabs.
- [ ] Back navigation works for stack screens.

## Onboarding Flow

- [ ] `Onboarding` slides render correctly.
- [ ] Next/Get Started button transitions work.
- [ ] Completing onboarding routes to main app (`Main` tabs).

## Home Screen

- [ ] Home header, streak card, quote, and stats render.
- [ ] Daily challenges list renders (or empty state is graceful).
- [ ] Habit cards render and can be toggled complete.
- [ ] FAB navigates to `Habits`.
- [ ] Settings icon navigates to `Settings`.

## Habits Flow

- [ ] `Habits` list renders existing habits/templates.
- [ ] Search filters habit list.
- [ ] Tap habit opens `HabitDetail`.
- [ ] Add button opens `AddHabit`.
- [ ] In `AddHabit`, adding template returns and reflects data change.

## Habit Detail

- [ ] Habit detail loads without crash.
- [ ] Mark-as-done button updates current streak.
- [ ] Mood selector updates selected state.
- [ ] Note input accepts text.
- [ ] Calendar/milestones/stat cards render.
- [ ] Streak chart renders (if enough data).

## Stats Screen

- [ ] Stats cards render numeric values.
- [ ] Skeleton appears briefly before data.
- [ ] Monthly, steps, sleep, weekday charts render without warnings.
- [ ] Habit breakdown list renders correctly.

## Achievements Screen

- [ ] Achievements list renders.
- [ ] Unlocked/locked styles differ clearly.
- [ ] Header unlocked count is correct format.

## Settings Screen

- [ ] Appearance toggle updates theme immediately.
- [ ] Export/Privacy actions open alerts.
- [ ] Version row renders.

## Quit Journey Screens

- [ ] `Quit` tab opens `QuitDashboard`.
- [ ] If profile missing, setup CTA opens `QuitOnboarding`.
- [ ] `QuitOnboarding` step flow works end-to-end.
- [ ] `QuitSettings`, `Savings`, `HealthTimeline`, `CravingsLog` open from dashboard actions.
- [ ] `CravingsLog` form saves and returns successfully.

## Error/Regression Checks

- [ ] No `TurboModuleRegistry` errors in web console.
- [ ] No `undefined is not an object` navigation errors.
- [ ] No blank screens after route transitions.
- [ ] No obvious style breakage (overlaps, clipped text, hidden buttons).

## Data Persistence

- [ ] Refresh browser tab and confirm core state persists:
  - habits
  - completion dates
  - onboarding complete state
  - quit profile (if configured)

## Quick Pass/Fail Criteria

Mark the build as **PASS** if:
- all navigation routes open successfully,
- no red-screen/runtime crash,
- no blocking console errors,
- critical flows (onboarding, habit toggle, add habit, quit log) complete.

Mark as **FAIL** if any critical route or flow crashes/blocks.

