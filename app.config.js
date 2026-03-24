/** @type {import('@expo/config').ConfigContext => import('@expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3005',
  },
});
