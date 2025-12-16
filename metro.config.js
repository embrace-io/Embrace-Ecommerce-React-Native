const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const embraceCorePath = path.resolve(
  __dirname,
  '../embrace-react-native-sdk/packages/core',
);
const embraceTracerProviderPath = path.resolve(
  __dirname,
  '../embrace-react-native-sdk/packages/react-native-tracer-provider',
);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [embraceCorePath, embraceTracerProviderPath],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(embraceCorePath, 'node_modules'),
      path.resolve(embraceTracerProviderPath, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
