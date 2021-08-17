const production = process.env.NODE_ENV === 'production'

module.exports = {
  env: {
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['out', 'dist', '**/*.d.ts'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        // this setting is required to use rules that require type information
        project: './tsconfig.json',
      },
      rules: {
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  root: true,
  rules: {
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'never',
      },
    ],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      production ? 'error' : 'warn',
      {
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/prefer-optional-chain': 'error',
    curly: 'error',
    eqeqeq: 'error',
    'import/extensions': [
      'error',
      'always',
      {
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'import/no-relative-parent-imports': 'error',
    'no-console': production
      ? [
          'error',
          {
            allow: ['warn', 'error'],
          },
        ]
      : 'off',
    'no-debugger': production ? 'error' : 'off',
    'no-empty': production ? 'error' : 'warn',
    'no-return-await': 'error',
    'no-throw-literal': 'error',
    'no-unneeded-ternary': 'error',
    'no-unreachable': production ? 'error' : 'warn',
    'no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTernary: true,
      },
    ],
    'no-useless-backreference': 'error',
    'no-useless-call': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-concat': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'no-useless-return': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'one-var': ['error', 'never'],
    'prefer-arrow-callback': 'error',
    'prefer-const': [
      'error',
      {
        destructuring: 'all',
      },
    ],
    'prefer-destructuring': [
      'error',
      {
        AssignmentExpression: {
          array: false,
          object: false,
        },
        VariableDeclarator: {
          array: false,
          object: true,
        },
      },
    ],
    'prefer-exponentiation-operator': 'error',
    'prefer-numeric-literals': 'error',
    'prefer-object-spread': 'error',
    'prefer-template': 'error',
    'prettier/prettier': production ? 'error' : 'warn',
    'require-await': production ? 'error' : 'warn',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts', '.tsx'],
      },
    },
  },
}
