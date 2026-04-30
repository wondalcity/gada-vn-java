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
//
// Why extraNodeModules alone is insufficient:
//   - Expo SDK 51 enables Metro's `unstable_enablePackageExports` by default,
//     which makes package.json#exports take priority and can bypass extraNodeModules.
//   - pnpm's isolated node_modules means packages in .pnpm/ may resolve React
//     through symlink paths that extraNodeModules doesn't intercept.
//
// resolveRequest fires at the lowest resolution level, before any other mechanism
// (extraNodeModules, package exports, hierarchical lookup), guaranteeing
// every require('react') in the entire bundle resolves to the same file.
// react-dom is not installed in React Native projects; omit it to avoid
// require.resolve() throwing at metro.config.js load time on the build server.
const REACT_SINGLETONS = {
  react: require.resolve('react'),
  'react-native': require.resolve('react-native'),
  'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (Object.prototype.hasOwnProperty.call(REACT_SINGLETONS, moduleName)) {
    return { filePath: REACT_SINGLETONS[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Secondary layer: catches subpath imports (react/jsx-runtime, etc.)
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

// Prevent "Cannot read property 'useMemo' of null" in Hermes production builds.
//
// Expo SDK 51 enables inline requires by default for performance. With inline
// requires, `require('react')` is called mid-function rather than at module
// initialisation time. If a circular dependency causes React's factory to run
// during ContextNavigator's render, React's exports are still an empty object
// when useMemo is accessed.
//
// nonInlinedRequires keeps these modules at the top of each factory so they
// are always resolved before any component code runs.
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
    nonInlinedRequires: [
      'react',
      'react-native',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
    ],
  },
});

// Hermes bundle optimisation
config.transformer.minifierConfig = {
  compress: {
    dead_code: true,
    unused: true,
  },
};

module.exports = config;
