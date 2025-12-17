const path = require('path');
const fs = require('fs');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const embraceCorePath = path.resolve(
  __dirname,
  '../embrace-react-native-sdk/packages/core',
);
const embraceTracerProviderPath = path.resolve(
  __dirname,
  '../embrace-react-native-sdk/packages/react-native-tracer-provider',
);

// Check if local Embrace SDK paths exist (for local development)
// In CI, we use npm packages instead, so these paths won't exist
const useLocalSdk =
  fs.existsSync(embraceCorePath) && fs.existsSync(embraceTracerProviderPath);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = useLocalSdk
  ? {
      watchFolders: [embraceCorePath, embraceTracerProviderPath],
      resolver: {
        nodeModulesPaths: [
          path.resolve(__dirname, 'node_modules'),
          path.resolve(embraceCorePath, 'node_modules'),
          path.resolve(embraceTracerProviderPath, 'node_modules'),
        ],
      },
    }
  : {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
