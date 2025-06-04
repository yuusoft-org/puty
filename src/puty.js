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
      // Only add mode and constructorArgs if mode is explicitly 'class'
      if (doc.mode === "class") {
        currentSuite.mode = "class";
        currentSuite.constructorArgs = doc.constructorArgs || [];
      }
    } else if (doc.case && currentSuite) {
      const testCase = {
        name: doc.case,
      };

      if (currentSuite.mode === "class") {
        testCase.executions = doc.executions || [];
      } else {
        testCase.in = doc.in || [];
        testCase.out = doc.out;
        if (doc.throws) {
          testCase.throws = doc.throws;
        }
      }

      currentSuite.cases.push(testCase);
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
        const { cases, mode } = suite;

        if (mode === "class") {
          setupClassTests(suite);
        } else {
          setupFunctionTests(suite);
        }
      });
    }
  });
};

const setupFunctionTests = (suite) => {
  const { cases } = suite;
  for (const testCase of cases) {
    const {
      name,
      in: inArg,
      out: expectedOut,
      functionUnderTest,
      throws,
    } = testCase;
    test(name, () => {
      if (!functionUnderTest) {
        throw new Error(`Function not found for test case: ${name}`);
      }

      if (throws) {
        // Test expects an error to be thrown
        expect(() => functionUnderTest(...(inArg || []))).toThrow(throws);
      } else {
        const out = functionUnderTest(...(inArg || []));
        expect(out).toEqual(expectedOut);
      }
    });
  }
};

const setupClassTests = (suite) => {
  const { cases, ClassUnderTest, constructorArgs } = suite;
  for (const testCase of cases) {
    const { name, executions } = testCase;
    test(name, () => {
      if (!ClassUnderTest) {
        throw new Error(`Class not found for test suite: ${suite.name}`);
      }

      const instance = new ClassUnderTest(...constructorArgs);

      for (const execution of executions) {
        const {
          method,
          in: inArg,
          out: expectedOut,
          throws,
          asserts,
        } = execution;

        // Validate method exists
        if (!instance[method] || typeof instance[method] !== "function") {
          throw new Error(`Method '${method}' not found on class instance`);
        }

        // Execute the method and check its return value
        if (throws) {
          expect(() => instance[method](...(inArg || []))).toThrow(throws);
        } else {
          const result = instance[method](...(inArg || []));
          if (expectedOut !== undefined) {
            expect(result).toEqual(expectedOut);
          }
        }

        // Run assertions
        if (asserts) {
          for (const assertion of asserts) {
            if (assertion.property) {
              // Property assertion
              const actualValue = instance[assertion.property];
              if (assertion.op === "eq") {
                expect(actualValue).toEqual(assertion.value);
              }
              // Add more operators as needed
            } else if (assertion.method) {
              // Method assertion
              if (
                !instance[assertion.method] ||
                typeof instance[assertion.method] !== "function"
              ) {
                throw new Error(
                  `Method '${assertion.method}' not found on class instance for assertion`,
                );
              }
              const result = instance[assertion.method](
                ...(assertion.in || []),
              );
              expect(result).toEqual(assertion.out);
            }
          }
        }
      }
    });
  }
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
    if (suite.mode === "class") {
      const exportName = suite.exportName || "default";
      const exported = module[exportName];
      if (!exported) {
        throw new Error(
          `Export '${exportName}' not found in module for class suite '${suite.name}'`,
        );
      }
      suite.ClassUnderTest = exported;
    } else {
      if (suite.exportName) {
        functionUnderTest = module[suite.exportName];
        if (!functionUnderTest) {
          throw new Error(
            `Export '${suite.exportName}' not found in module for suite '${suite.name}'`,
          );
        }
      }
      for (const testCase of suite.cases) {
        testCase.functionUnderTest = functionUnderTest;
      }
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
