/**
 * @fileoverview Main entry point for the puty testing framework
 * Exports the primary function for setting up YAML-driven test suites.
 */

import { setupTestSuiteFromYaml } from "./puty.js";
import { putyPlugin } from "./vitest-plugin.js";

/**
 * Main entry point function for discovering and setting up test suites from YAML files
 * @see {@link setupTestSuiteFromYaml} for detailed documentation
 */
export { setupTestSuiteFromYaml };

/**
 * Vitest plugin for automatic YAML test file discovery
 * @see {@link putyPlugin} for detailed documentation
 */
export { putyPlugin };
