const { expo } = require('./app.json');

/** @type {{ expo: import('@expo/config').ExpoConfig }} */
module.exports = {
  expo: {
    ...expo,
    extra: {
      ...expo.extra,
      apiUrl:
        process.env.EXPO_PUBLIC_API_URL ||
        'https://healthylifetrackerapp.vercel.app',
    },
  },
};
