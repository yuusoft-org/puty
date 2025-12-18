/**
 * @fileoverview Vitest plugin for puty - enables YAML test files without manual setup
 */

import path from "node:path";

/**
 * Vitest plugin that automatically configures puty for YAML test discovery
 * @returns {import('vite').Plugin} Vite/Vitest plugin
 * @example
 * // vitest.config.js
 * import { defineConfig } from 'vitest/config'
 * import { putyPlugin } from 'puty/vitest'
 *
 * export default defineConfig({
 *   plugins: [putyPlugin()]
 * })
 */
export function putyPlugin() {
  return {
    name: "vitest:puty",

    config() {
      return {
        test: {
          include: [
            "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            "**/*.{test,spec}.{yaml,yml}",
          ],
        },
      };
    },

    transform(code, id) {
      // Only transform YAML test files
      if (!/\.(test|spec)\.(yaml|yml)$/.test(id)) {
        return null;
      }

      const yamlDir = path.dirname(id);

      // Generate a JS module that loads and runs this specific YAML file
      const transformedCode = `
import { setupTestSuiteFromYaml } from 'puty';
await setupTestSuiteFromYaml('${yamlDir}', '${path.basename(id)}');
`;

      return {
        code: transformedCode,
        map: null,
      };
    },
  };
}
