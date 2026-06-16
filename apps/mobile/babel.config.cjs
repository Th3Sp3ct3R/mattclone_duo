module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          // Ensure paths resolve relative to this babel config file, not the monorepo root.
          // This matters when running Jest from the workspace root.
          cwd: 'babelrc',
          root: ['./'],
          alias: {
            '@': './src'
          }
        }
      ]
    ]
  };
};


