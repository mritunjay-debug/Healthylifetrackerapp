# UI Audit (After Refactor)

This audit lists which screens currently use which shared UI building blocks. Even where a screen has not been fully converted to primitives, it has been aligned to the token palette from `contexts/ThemeContext`.

## Shared primitives / components used
- `components/ui/Card.tsx`
- `components/ui/SectionHeader.tsx`
- `components/ui/ProgressBar.tsx`
- `components/ui/GradientFill.tsx`
- `components/ui/Skeleton.tsx`

## Screen-by-screen
- `screens/HomeScreen.tsx`
  - Uses: `Card`, `SectionHeader`, `ProgressBar`, `GradientFill`
  - Notes: streak/progress now have gradient glows and consistent color tokens
- `screens/HabitsScreen.tsx`
  - Uses: token-based styling (no primitives yet)
- `screens/StatsScreen.tsx`
  - Uses: `SkeletonBlock` for charts/stats during loading
  - Notes: chart config colors mapped to theme tokens
- `screens/HabitDetailScreen.tsx`
  - Uses: `SkeletonBlock` for the loading state
  - Notes: chart config + main typography mapped to theme tokens
- `screens/AchievementsScreen.tsx`
  - Uses: token-based styling (no primitives yet)
- `screens/SettingsScreen.tsx`
  - Uses: token-based styling (no primitives yet)
- `screens/OnboardingScreen.tsx`
  - Uses: token-based styling (no primitives yet)
- `screens/QuitOnboardingScreen.tsx`
  - Uses: token-based styling (no primitives yet)
- `screens/QuitDashboardScreen.tsx`
  - Uses: `SkeletonBlock` during data load
  - Notes: actions button styling uses consistent press behavior
- `screens/CravingsLogScreen.tsx`
  - Uses: token-based styling (no primitives yet)
- `components/SensorTracker.tsx`
  - Uses: token-based styling (no primitives yet)

## Follow-up opportunities (optional)
- Convert the remaining list/card-heavy screens to `Card`, `SectionHeader`, and `Chip` primitives for even stronger consistency.
- Add `Button`/`IconButton` usage in remaining screens to standardize press feedback.

