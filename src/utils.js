/**
 * @fileoverview Utility functions for YAML processing with !include directive support
 * This module provides functions for loading YAML files with include capabilities,
 * directory traversal, and parsing YAML test configurations.
 */

import fs from "node:fs";
import path, { join } from "node:path";

import yaml from "js-yaml";

/**
 * Loads a YAML file with support for !include directives and circular dependency detection
 * @param {string} filePath - Absolute or relative path to the YAML file to load
 * @param {Set<string>} [visitedFiles=new Set()] - Set of already visited file paths for circular dependency detection
 * @returns {any|any[]} The parsed YAML content. Returns single object for single documents, array for multi-document YAML
 * @throws {Error} When circular dependencies are detected, files are not found, or YAML parsing fails
 * @example
 * // Load a simple YAML file
 * const config = loadYamlWithPath('./config.yaml');
 * 
 * // Load YAML with includes
 * const data = loadYamlWithPath('./main.yaml'); // main.yaml contains: data: !include ./data.yaml
 */
export const loadYamlWithPath = (filePath, visitedFiles = new Set()) => {
  const absolutePath = path.resolve(filePath);

  // Check for circular dependencies
  if (visitedFiles.has(absolutePath)) {
    throw new Error(
      `Circular dependency detected: ${absolutePath} is already being processed`,
    );
  }

  // Add current file to visited set
  visitedFiles.add(absolutePath);

  const includeType = new yaml.Type("!include", {
    kind: "scalar",
    construct: function (includePath) {
      // Resolve include path relative to the current file's directory
      const currentDir = path.dirname(absolutePath);
      const resolvedIncludePath = path.resolve(currentDir, includePath);

      // Check if included file exists
      if (!fs.existsSync(resolvedIncludePath)) {
        throw new Error(
          `Include file not found: ${resolvedIncludePath} (included from ${absolutePath})`,
        );
      }

      // Recursively load the included file with the same visited files set
      return loadYamlWithPath(resolvedIncludePath, new Set(visitedFiles));
    },
  });

  const schema = yaml.DEFAULT_SCHEMA.extend([includeType]);

  try {
    const content = fs.readFileSync(absolutePath, "utf8");
    // Always use loadAll - it handles both single and multi-document YAML
    const docs = yaml.loadAll(content, { schema });
    // If only one document, return it directly (not as array)
    return docs.length === 1 ? docs[0] : docs;
  } catch (error) {
    throw new Error(
      `Error loading YAML file ${absolutePath}: ${error.message}`,
    );
  } finally {
    // Remove current file from visited set when done processing
    visitedFiles.delete(absolutePath);
  }
};

/**
 * Recursively traverses a directory and returns all files matching the specified extensions
 * @param {string} startPath - The directory path to start traversing from
 * @param {string[]} extensions - Array of file extensions to match (e.g., ['.yaml', '.yml'])
 * @returns {string[]} Array of absolute file paths for all matching files found
 * @example
 * // Find all YAML test files
 * const testFiles = traverseAllFiles('./tests', ['.test.yaml', '.spec.yml']);
 * 
 * // Find all JavaScript files
 * const jsFiles = traverseAllFiles('./src', ['.js', '.ts']);
 */
export const traverseAllFiles = (startPath, extensions) => {
  const results = [];
  const files = fs.readdirSync(startPath);
  for (const file of files) {
    const filePath = path.join(startPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      results.push(...traverseAllFiles(filePath, extensions));
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  return results;
};

/**
 * Recursively flattens nested arrays of YAML documents that result from multi-document includes
 * @param {any|any[]} data - The data to flatten, can be a single document or nested arrays
 * @returns {any[]} Flattened array of documents
 * @example
 * // Flatten nested document arrays
 * const nested = [doc1, [doc2, doc3], doc4];
 * const flat = flattenDocuments(nested); // [doc1, doc2, doc3, doc4]
 */
const flattenDocuments = (data) => {
  if (!Array.isArray(data)) {
    return [data];
  }

  const result = [];
  for (const item of data) {
    if (Array.isArray(item)) {
      result.push(...flattenDocuments(item));
    } else {
      result.push(item);
    }
  }
  return result;
};

/**
 * Processes an array of YAML documents and converts them into a structured test configuration
 * @param {any[]} docs - Array of YAML document objects to process
 * @returns {Object} Structured test configuration object
 * @returns {string|null} returns.file - Path to the JavaScript file being tested
 * @returns {string|null} returns.group - Test group name
 * @returns {string[]} [returns.suiteNames] - Array of suite names defined in config
 * @returns {Object[]} returns.suites - Array of test suite objects
 * @returns {string} returns.suites[].name - Suite name
 * @returns {string} returns.suites[].exportName - Function/class export name to test
 * @returns {Object[]} returns.suites[].cases - Array of test cases
 * @returns {string} [returns.suites[].mode] - Test mode ('class' for class testing)
 * @returns {any[]} [returns.suites[].constructorArgs] - Constructor arguments for class mode
 * @example
 * const docs = [
 *   { file: './math.js', group: 'math', suites: ['add'] },
 *   { suite: 'add', exportName: 'add' },
 *   { case: 'add 1+2', in: [1, 2], out: 3 }
 * ];
 * const config = processDocuments(docs);
 */
const processDocuments = (docs) => {
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
 * Parses a YAML file with !include directive support and converts it into a structured test configuration
 * @param {string} filePath - Path to the YAML file to parse
 * @returns {Object} Structured test configuration object ready for test execution
 * @throws {Error} When file cannot be found, YAML is invalid, or circular dependencies are detected
 * @example
 * // Parse a test configuration file with includes
 * const config = parseWithIncludes('./tests/math.spec.yaml');
 * // Returns: { file: './math.js', group: 'math', suites: [...] }
 * 
 * // Works with files containing !include directives
 * // main.yaml: 
 * // file: './lib.js'
 * // ---
 * // !include ./test-cases.yaml
 * const config = parseWithIncludes('./main.yaml');
 */
export const parseWithIncludes = (filePath) => {
  const yamlData = loadYamlWithPath(filePath);

  // Flatten any nested arrays that come from multi-document includes
  const flattenedDocs = flattenDocuments(yamlData);

  return processDocuments(flattenedDocs);
};
