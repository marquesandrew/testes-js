const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'coverage/', 'playwright-report*/', 'test-results*/', 'playwright/.auth/', 'public/'] },
  js.configs.recommended,
  {
    // convenção: parâmetro que PRECISA existir (aridade do Express/Cucumber) mas não é usado começa com _
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node } },
  },
  { files: ['tests/**/*.js'], languageOptions: { globals: { ...globals.jest } } },
  { files: ['public/**/*.js'], languageOptions: { sourceType: 'script', globals: { ...globals.browser } } },
];
