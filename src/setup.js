/**
 * @fileoverview Vitest setup file for puty - discovers and registers YAML test files
 */

import { setupTestSuiteFromYaml } from "./puty.js";

await setupTestSuiteFromYaml(process.cwd());
