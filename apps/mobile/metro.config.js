const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Support monorepo packages
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// CRITICAL: Force single React instance across the entire pnpm monorepo.
// Without this, pnpm's isolated node_modules can cause different packages
// to resolve to separate React copies → "Cannot read property 'useMemo' of null"
// crash in ContextNavigator (Expo Router's root navigator) on Hermes/Android.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
};

// Hermes bundle optimization
config.transformer.minifierConfig = {
  compress: {
    dead_code: true,
    unused: true,
  },
};

module.exports = config;
