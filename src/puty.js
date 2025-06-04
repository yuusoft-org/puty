import path from "node:path";
import fs from "node:fs";
import yaml from "js-yaml";
import { expect, test, describe } from "vitest";

import { traverseAllFiles } from "./utils.js";

const extensions = [".test.yaml", ".test.yml", ".spec.yaml", ".spec.yml"];

/**
 * Parse YAML content with document separators into structured test config
 */
export const parseYamlDocuments = (yamlContent) => {
  const docs = yaml.loadAll(yamlContent);
  const config = {
    file: null,
    group: null,
    suites: [],
  };

  let currentSuite = null;

  for (const doc of docs) {
    if (doc.file) {
      config.file = doc.file;
      config.group = doc.group || doc.name;
      if (doc.suites) {
        config.suiteNames = doc.suites;
      }
    } else if (doc.suite) {
      if (currentSuite) {
        config.suites.push(currentSuite);
      }
      currentSuite = {
        name: doc.suite,
        exportName: doc.exportName || doc.suite,
        cases: [],
      };
    } else if (doc.case && currentSuite) {
      currentSuite.cases.push({
        name: doc.case,
        in: doc.in || [],
        out: doc.out,
      });
    }
  }

  if (currentSuite) {
    config.suites.push(currentSuite);
  }

  return config;
};

/**
 *
 * @param {*} testConfig
 */
const setupTestSuite = (testConfig) => {
  const { group, suites, skip } = testConfig;
  if (skip) {
    return;
  }
  describe(group, () => {
    for (const suite of suites) {
      describe(suite.name, () => {
        const { cases } = suite;
        for (const testCase of cases) {
          const {
            name,
            in: inArg,
            out: expectedOut,
            functionUnderTest,
          } = testCase;
          test(name, () => {
            const out = functionUnderTest(...(inArg || []));
            if (out instanceof Error) {
              expect(out.message).toEqual(out.message);
            } else {
              expect(out).toEqual(expectedOut);
            }
          });
        }
      });
    }
  });
};

/**
 *
 * @param {*} module
 * @param {*} originalTestConfig
 * @returns
 */
export const injectFunctions = (module, originalTestConfig) => {
  const testConfig = structuredClone(originalTestConfig);
  let functionUnderTest = module[testConfig.exportName || "default"];

  for (const suite of testConfig.suites) {
    if (suite.exportName) {
      functionUnderTest = module[suite.exportName];
    }
    for (const testCase of suite.cases) {
      testCase.functionUnderTest = functionUnderTest;
    }
  }
  return testConfig;
};

/**
 * Setup test suites from all yaml files in the current directory and its subdirectories
 */
export const setupTestSuiteFromYaml = async (dirname) => {
  const testYamlFiles = traverseAllFiles(dirname, extensions);
  for (const file of testYamlFiles) {
    const yamlContent = fs.readFileSync(file, "utf8");
    const testConfig = parseYamlDocuments(yamlContent);
    const filepathRelativeToSpecFile = path.join(
      path.dirname(file),
      testConfig.file,
    );

    // testConfig.file is relative to the spec file
    const module = await import(filepathRelativeToSpecFile);
    const testConfigWithInjectedFunctions = injectFunctions(module, testConfig);
    setupTestSuite(testConfigWithInjectedFunctions);
  }
};
