import { expect, test, describe } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { loadYamlWithPath, parseWithIncludes } from "../src/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("loadYamlWithPath", () => {
  test("should load YAML file with basic !include", () => {
    const filePath = path.join(__dirname, "fixtures/include-basic/main.yaml");
    const result = loadYamlWithPath(filePath);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);

    // First document: configuration
    expect(result[0]).toEqual({
      file: "./math.js",
      group: "math-include",
      suites: ["add"],
    });

    // Second document: suite definition
    expect(result[1]).toEqual({
      suite: "add",
      exportName: "add",
    });

    // Third document: test cases (array of cases)
    expect(Array.isArray(result[2])).toBe(true);
    expect(result[2]).toHaveLength(2);
    expect(result[2][0]).toEqual({
      case: "add 1 and 2",
      in: [1, 2],
      out: 3,
    });
    expect(result[2][1]).toEqual({
      case: "add 5 and 7",
      in: [5, 7],
      out: 12,
    });
  });

  test("should handle !include for individual values", () => {
    const filePath = path.join(__dirname, "fixtures/include-values/main.yaml");
    const result = loadYamlWithPath(filePath);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);

    // Configuration document
    expect(result[0]).toEqual({
      file: "./simple.js",
      group: "values-test",
    });

    // Suite document
    expect(result[1]).toEqual({
      suite: "test",
    });

    // Test case with included values
    expect(result[2]).toEqual({
      case: "test with included values",
      in: [10, 20],
      out: 30,
    });
  });

  test("should handle recursive !include", () => {
    const filePath = path.join(
      __dirname,
      "fixtures/include-recursive/main.yaml",
    );
    const result = loadYamlWithPath(filePath);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);

    // Configuration document
    expect(result[0]).toEqual({
      file: "./lib.js",
      group: "recursive-test",
    });

    // The included level1.yaml contains multiple documents, so they come back as an array
    expect(Array.isArray(result[1])).toBe(true);
    expect(result[1]).toHaveLength(2);

    // Suite document (from level1.yaml)
    expect(result[1][0]).toEqual({
      suite: "test",
      exportName: "default",
    });

    // Test case (from level2.yaml via level1.yaml)
    expect(result[1][1]).toEqual({
      case: "nested include test",
      in: [],
      out: "success",
    });
  });

  test("should detect circular dependencies", () => {
    const filePath = path.join(__dirname, "fixtures/test-circular/a.yaml");

    expect(() => {
      loadYamlWithPath(filePath);
    }).toThrow(/Circular dependency detected/);
  });

  test("should handle missing include files", () => {
    const tempDir = path.join(__dirname, "fixtures/temp");
    const tempFile = path.join(tempDir, "missing-include.yaml");

    // Create a temporary file that includes a non-existent file
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempFile, "data: !include ./non-existent.yaml");

    expect(() => {
      loadYamlWithPath(tempFile);
    }).toThrow(/Include file not found/);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true });
  });

  test("should handle single document YAML without separators", () => {
    const tempDir = path.join(__dirname, "fixtures/temp");
    const tempFile = path.join(tempDir, "single-doc.yaml");
    const includedFile = path.join(tempDir, "included.yaml");

    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(includedFile, "value: 42");
    fs.writeFileSync(tempFile, "config: !include ./included.yaml");

    const result = loadYamlWithPath(tempFile);

    expect(result).toEqual({
      config: { value: 42 },
    });

    // Cleanup
    fs.rmSync(tempDir, { recursive: true });
  });

  test("should handle the original test-include examples", () => {
    const filePath = path.join(
      __dirname,
      "fixtures/test-include/main.test.yaml",
    );
    const result = loadYamlWithPath(filePath);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(5);

    // Configuration document
    expect(result[0]).toEqual({
      file: "../examples/math.js",
      group: "math-include-test",
      suites: ["add", "increment"],
    });

    // Suite definition
    expect(result[1]).toEqual({
      suite: "add",
      exportName: "add",
    });

    // Test cases (array)
    expect(Array.isArray(result[2])).toBe(true);
    expect(result[2]).toHaveLength(2);

    // Increment suite
    expect(result[3]).toEqual({
      suite: "increment",
      exportName: "default",
    });

    // Test case with included values
    expect(result[4]).toEqual({
      case: "increment with include",
      in: [5],
      out: 6,
    });
  });
});

describe("parseWithIncludes", () => {
  test("should parse multi-document YAML with includes into test config", () => {
    const filePath = path.join(__dirname, "fixtures/include-basic/main.yaml");
    const result = parseWithIncludes(filePath);

    expect(result).toEqual({
      file: "./math.js",
      group: "math-include",
      suiteNames: ["add"],
      suites: [
        {
          name: "add",
          exportName: "add",
          cases: [
            {
              name: "add 1 and 2",
              in: [1, 2],
              out: 3,
            },
            {
              name: "add 5 and 7",
              in: [5, 7],
              out: 12,
            },
          ],
        },
      ],
    });
  });

  test("should parse YAML with included values", () => {
    const filePath = path.join(__dirname, "fixtures/include-values/main.yaml");
    const result = parseWithIncludes(filePath);

    expect(result).toEqual({
      file: "./simple.js",
      group: "values-test",
      suites: [
        {
          name: "test",
          exportName: "test",
          cases: [
            {
              name: "test with included values",
              in: [10, 20],
              out: 30,
            },
          ],
        },
      ],
    });
  });

  test("should handle recursive includes", () => {
    const filePath = path.join(
      __dirname,
      "fixtures/include-recursive/main.yaml",
    );
    const result = parseWithIncludes(filePath);

    expect(result).toEqual({
      file: "./lib.js",
      group: "recursive-test",
      suites: [
        {
          name: "test",
          exportName: "default",
          cases: [
            {
              name: "nested include test",
              in: [],
              out: "success",
            },
          ],
        },
      ],
    });
  });

  test("should propagate circular dependency errors", () => {
    const filePath = path.join(__dirname, "fixtures/test-circular/a.yaml");

    expect(() => {
      parseWithIncludes(filePath);
    }).toThrow(/Circular dependency detected/);
  });
});
