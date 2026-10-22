import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({ resolve:{alias:{'@':fileURLToPath(new URL('./apps/api/src/',import.meta.url))}}, test:{include:['apps/api/tests/**/*.test.ts','apps/api/src/resources/lim/lim.test.ts','packages/ai/tests/**/*.test.ts','scripts/**/*.test.ts','apps/web/tests/**/*.test.ts'],restoreMocks:true} });
