export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['mobile', 'api', 'shared', 'sync', 'ci', 'docs', 'deps']],
  },
};
