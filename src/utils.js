import fs from "node:fs";
import path, { join } from "node:path";

import yaml from "js-yaml";

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
    // Check if content contains document separators
    if (content.includes("---")) {
      return yaml.loadAll(content, { schema });
    } else {
      return yaml.load(content, { schema });
    }
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
 * Traverse all files in the current directory and its subdirectories
 * Return an array of full path of files
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
 * Recursively flatten nested arrays of documents
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
 * Process an array of YAML documents into structured test config
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
 * Parse YAML file with !include support into structured test config
 */
export const parseYamlDocumentsWithIncludes = (filePath) => {
  const yamlData = loadYamlWithPath(filePath);

  // Flatten any nested arrays that come from multi-document includes
  const flattenedDocs = flattenDocuments(yamlData);

  return processDocuments(flattenedDocs);
};
