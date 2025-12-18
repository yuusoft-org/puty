/**
 * @fileoverview Vitest plugin for puty - enables YAML test files without manual setup
 */

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
          setupFiles: ["puty/setup"],
          forceRerunTriggers: ["**/*.{test,spec}.{yaml,yml}"],
        },
      };
    },
  };
}
