import tseslint from 'typescript-eslint';
// Ship uses the `ts` rule namespace in its reviewed source and generators.
const recommended = tseslint.configs.recommended.map(config => ({ ...config,
  ...(config.rules ? {rules:Object.fromEntries(Object.entries(config.rules).map(([key,value]) => [key.replace('@typescript-eslint/','ts/'),value]))} : {}),
}));
export default tseslint.config(
  { ignores: ['**/dist/**','**/.output/**','**/.tanstack/**','**/node_modules/**','**/routeTree.gen.ts'] },
  { linterOptions:{reportUnusedDisableDirectives:'off'} },
  ...recommended,
  { plugins:{ts:tseslint.plugin},files:['**/*.ts','**/*.tsx'],rules:{'ts/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]} },
);
