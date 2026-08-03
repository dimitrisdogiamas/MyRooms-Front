const appJson = require("./app.json");

/** @type {import('expo/config').ExpoConfig} */
const expoConfig = {
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    // Local: ./google-services.json | EAS Build: file env GOOGLE_SERVICES_JSON
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
};

module.exports = {
  expo: expoConfig,
};
