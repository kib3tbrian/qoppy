const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ensure transformer supports Fast Refresh and modern features
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
  // Enable Fast Refresh (React Native's hot reloading)
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
