module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
  extends: [
    '@nuxtjs',
    'prettier',
    'prettier/vue',
    'plugin:prettier/recommended',
    'plugin:nuxt/recommended',
  ],
  plugins: ['prettier'],
  // add your custom rules here
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
    'spaced-comment': 'off',
    'no-new': 'off',
    'require-await': 'off',
    'no-unmodified-loop-condition': 'off',
    'prefer-promise-reject-errors': 'off'
  },
}
