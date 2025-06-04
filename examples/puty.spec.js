import { setupTestSuiteFromYaml } from "../src/puty.js";

// This will discover and run all .spec.yaml files in the examples directory
await setupTestSuiteFromYaml("./examples");