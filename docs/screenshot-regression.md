# Screenshot Regression (Later)

This repo currently cannot be visually tested by me in this environment. When you can run the app, this is the quickest workflow to create a repeatable “UI diff” loop.

## What to test
Capture screenshots for:
- `HomeScreen`
- `HabitsScreen`
- `StatsScreen`
- `HabitDetailScreen`
- `AchievementsScreen`
- `SettingsScreen`
- `QuitOnboardingScreen`
- `QuitDashboardScreen`
- `CravingsLogScreen`

## Manual workflow (no extra dependencies)
1. Run Expo web: `npm run web`
2. Navigate to each screen (use the bottom tabs + stack navigation).
3. Capture screenshots at the same viewport size each time (example: 390x844).
4. Store them under `screenshots/<date>/<screen>.png`
5. Compare images in any diff tool you prefer.

## Optional: automated diff (future)
You can later switch to Playwright-based screenshot testing if you want automation. The plan would be:
- Use `@playwright/test` to open Expo web
- Capture per-route screenshots
- Compare against a baseline folder and fail CI on diffs

