const appJson = require("./app.json");

const googleKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...appJson.expo.plugins,
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow H2O to use your location to pin your delivery address on the map.",
        },
      ],
    ],
    android: {
      ...appJson.expo.android,
      config: {
        googleMaps: {
          apiKey: googleKey,
        },
      },
    },
    ios: {
      ...appJson.expo.ios,
      config: {
        googleMapsApiKey: googleKey,
      },
    },
    extra: {
      ...appJson.expo.extra,
      googleMapsApiKey: googleKey,
    },
  },
};
