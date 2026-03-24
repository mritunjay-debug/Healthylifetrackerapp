# StreakForge - Offline Habit & Streak Tracker

A comprehensive mobile app for building unbreakable habits with advanced features including quit smoking support, dieting tracking, and sensor-based health monitoring.

## Features

- **Habit Tracking**: Create and maintain streaks with beautiful calendar heatmaps
- **Quit & Transform**: Comprehensive smoking cessation support with cravings logging and health benefits timeline
- **Gamification**: Levels, achievements, points, and daily challenges
- **Sensor Integration**: Automatic sleep and activity tracking (when available)
- **Account sign-in**: Email/password via your deployed API (`/api/auth/login`, `/api/auth/signup`); session stored securely
- **Offline-First**: Habit data stored locally; API used for authentication
- **Beautiful UI**: Modern design with teal-orange gradients, neumorphic cards, and micro-animations

## Tech Stack

- React Native with Expo SDK 54
- TypeScript
- React Navigation v6
- AsyncStorage for local data
- React Native Chart Kit for visualizations
- Expo Sensors for device tracking

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Point the app at a local API — copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`. The default is the production URL in `app.config.js`.

3. Start the development server:
   ```bash
   npm start
   ```

   If you also run the API locally, start it in a separate terminal:
   ```bash
   cd server
   npm run dev:api
   ```
   Then return to the repository root before running Expo. Do not run Expo from `server/`.

4. Scan the QR code with Expo Go on your device, then sign in or create an account.

You now land on a welcome screen where account creation is optional. You can continue as guest immediately.

If signup shows a network error on phone, set `EXPO_PUBLIC_API_URL` to your computer LAN IP (example: `http://192.168.1.10:3005`) and restart Expo.

For Google sign-in redirects in Supabase, add:
- `streakforge://auth/callback` (native/dev build)
- `https://auth.expo.io/@arcadalabs/agon-preview` (Expo Go)

## SDK Compatibility

This project uses **Expo SDK 54** for full compatibility with the standard Expo Go app available on app stores. For SDK 55 features, use a development build instead.

## App Structure

- `screens/`: Main app screens
- `components/`: Reusable UI components
- `lib/`: Utilities, types, and storage functions
- `navigation/`: Navigation configuration
- `contexts/`: React contexts for theme and data

## Features Overview

### Core Habit Tracking
- Create custom habits with streaks
- Calendar heatmap visualization
- Progress analytics and insights

### Quit & Transform Section
- Onboarding wizard for quit setup
- Cravings logging with intensity and triggers
- Money saved calculator
- Health benefits timeline with milestones
- Diet tracking integration

### Advanced Features
- Sensor-based sleep and activity tracking
- Gamification with achievements and levels
- Daily challenges and rewards
- Dark/light mode support

## Privacy

All data is stored locally on your device. No data is sent to external servers.