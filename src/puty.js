/**
 * @fileoverview Main test framework functionality for YAML-driven testing
 * This module provides functions for setting up test suites from YAML configurations,
 * injecting functions/classes from modules, and executing tests using vitest.
 */

import path from "node:path";
import yaml from "js-yaml";
import { expect, test, describe } from "vitest";

import { traverseAllFiles, parseWithIncludes } from "./utils.js";

/**
 * File extensions that are recognized as YAML test files
 * @type {string[]}
 */
const extensions = [".test.yaml", ".test.yml", ".spec.yaml", ".spec.yml"];

/**
 * Parses YAML content containing multiple documents separated by '---' into a structured test configuration
 * @param {string} yamlContent - Raw YAML content string to parse
 * @returns {Object} Structured test configuration object
 * @returns {string|null} returns.file - Path to the JavaScript file being tested
 * @returns {string|null} returns.group - Test group name  
 * @returns {string[]} [returns.suiteNames] - Array of suite names defined in config
 * @returns {Object[]} returns.suites - Array of test suite objects
 * @example
 * const yamlContent = `
 * file: './math.js'
 * group: math
 * ---
 * suite: add
 * exportName: add
 * ---
 * case: add 1 and 2
 * in: [1, 2]
 * out: 3
 * `;
 * const config = parseYamlDocuments(yamlContent);
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
 * Sets up and registers test suites with the testing framework (vitest)
 * @param {Object} testConfig - Test configuration object containing suites and cases
 * @param {string} testConfig.group - Name of the test group (used as describe block name)
 * @param {Object[]} testConfig.suites - Array of test suite objects
 * @param {boolean} [testConfig.skip] - Whether to skip this entire test suite
 * @example
 * setupTestSuite({
 *   group: 'math',
 *   suites: [{
 *     name: 'add',
 *     cases: [{ name: 'add 1+2', functionUnderTest: addFn, in: [1,2], out: 3 }]
 *   }]
 * });
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

/**
 * Sets up individual test cases for function-based testing
 * @param {Object} suite - Test suite configuration
 * @param {Object[]} suite.cases - Array of test case objects
 * @param {string} suite.cases[].name - Test case name
 * @param {any[]} suite.cases[].in - Input arguments for the function
 * @param {any} suite.cases[].out - Expected output value
 * @param {Function} suite.cases[].functionUnderTest - The function to test
 * @param {string|RegExp} [suite.cases[].throws] - Expected error message/pattern if function should throw
 */
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

/**
 * Sets up individual test cases for class-based testing
 * @param {Object} suite - Test suite configuration for class testing
 * @param {Object[]} suite.cases - Array of test case objects
 * @param {string} suite.cases[].name - Test case name  
 * @param {Object[]} suite.cases[].executions - Array of method executions to perform
 * @param {Function} suite.ClassUnderTest - The class constructor to test
 * @param {any[]} suite.constructorArgs - Arguments to pass to class constructor
 */
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
 * Injects functions and classes from an imported module into test configuration objects
 * @param {Object} module - The imported JavaScript module containing functions/classes to test
 * @param {Object} originalTestConfig - Original test configuration object
 * @returns {Object} Test configuration with injected functions/classes ready for testing
 * @throws {Error} When required exports are not found in the module
 * @example
 * // Import module and inject functions
 * const module = await import('./math.js');
 * const testConfig = { 
 *   suites: [{ name: 'add', exportName: 'add', cases: [...] }] 
 * };
 * const ready = injectFunctions(module, testConfig);
 * // ready.suites[0].cases[0].functionUnderTest === module.add
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
 * Discovers and sets up test suites from all YAML test files in a directory and its subdirectories
 * @param {string} dirname - Directory path to search for YAML test files
 * @returns {Promise<void>} Promise that resolves when all test suites are set up
 * @throws {Error} When YAML files cannot be parsed or modules cannot be imported
 * @example
 * // Set up all test suites from YAML files in the current directory
 * await setupTestSuiteFromYaml('.');
 * 
 * // Set up tests from a specific directory
 * await setupTestSuiteFromYaml('./tests');
 * 
 * // This will find all files matching: *.test.yaml, *.test.yml, *.spec.yaml, *.spec.yml
 */
export const setupTestSuiteFromYaml = async (dirname) => {
  const testYamlFiles = traverseAllFiles(dirname, extensions);
  for (const file of testYamlFiles) {
    const testConfig = parseWithIncludes(file);
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
