/** @type {import('@expo/config').ConfigContext => import('@expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins || []), 'expo-web-browser'],
  extra: {
    ...config.extra,
    // Keep optional; runtime can infer LAN host in Expo Go.
    apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
  },
});
