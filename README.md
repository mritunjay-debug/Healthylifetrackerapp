# StreakForge - Offline Habit & Streak Tracker

A comprehensive mobile app for building unbreakable habits with advanced features including quit smoking support, dieting tracking, and sensor-based health monitoring.

## Features

- **Habit Tracking**: Create and maintain streaks with beautiful calendar heatmaps
- **Quit & Transform**: Comprehensive smoking cessation support with cravings logging and health benefits timeline
- **Gamification**: Levels, achievements, points, and daily challenges
- **Sensor Integration**: Automatic sleep and activity tracking (when available)
- **Offline-First**: All data stored locally, no internet required
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

2. Start the development server:
   ```bash
   npm start
   ```

3. Scan the QR code with Expo Go on your device.

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