/**
 * @fileoverview Vitest setup file for puty - discovers and registers YAML test files
 */

import { setupTestSuiteFromYaml } from "./puty.js";

// Use globalThis to ensure setup only runs once across all imports
if (!globalThis.__putySetupComplete) {
  globalThis.__putySetupComplete = true;
  await setupTestSuiteFromYaml(process.cwd());
}
