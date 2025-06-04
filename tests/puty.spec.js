import { expect, test, describe } from "vitest";

import { injectFunctions, parseYamlDocuments } from "../src/puty.js";

describe("injectFunctions", () => {
  test("should inject functions without root exportName", () => {
    const module = {
      default: "injectFunction default",
      namedModuleFunction: "injectFunction namedModuleFunction",
    };
    const testConfig = {
      name: "test",
      suites: [
        {
          name: "test",
          cases: [
            {
              name: "test",
              in: [
                {
                  aef: "392ejkls",
                },
              ],
            },
          ],
        },
        {
          name: "test 2",
          exportName: "namedModuleFunction",
          cases: [
            {
              name: "test",
              in: [
                {
                  aef: "392ejkls",
                },
              ],
            },
          ],
        },
      ],
    };

    const expected = {
      name: "test",
      suites: [
        {
          name: "test",
          cases: [
            {
              name: "test",
              functionUnderTest: "injectFunction default",
              in: [
                {
                  aef: "392ejkls",
                },
              ],
            },
          ],
        },
        {
          name: "test 2",
          exportName: "namedModuleFunction",
          cases: [
            {
              name: "test",
              functionUnderTest: "injectFunction namedModuleFunction",
              in: [
                {
                  aef: "392ejkls",
                },
              ],
            },
          ],
        },
      ],
    };

    const testConfigWithInjectedFunctions = injectFunctions(module, testConfig);
    expect(testConfigWithInjectedFunctions).toEqual(expected);
  });

  test("should inject functions with root exportName", () => {
    const module = {
      default: "injectFunction default",
      namedModuleFunction: "injectFunction namedModuleFunction",
    };
    const testConfig = {
      name: "test",
      exportName: "namedModuleFunction",
      suites: [
        {
          name: "test",
          cases: [
            {
              name: "test",
              in: [
                {
                  aef: "392ejkls",
                },
              ],
            },
          ],
        },
        {
          name: "test 2",
          exportName: "default",
          cases: [
            {
              name: "test",
              in: [
                {
                  aef: "392ejkls",
                },
              ],
            },
          ],
        },
      ],
    };

    const expected = {
      name: "test",
      exportName: "namedModuleFunction",
      suites: [
        {
          name: "test",
          cases: [
            {
              name: "test",
              functionUnderTest: "injectFunction namedModuleFunction",
              in: [
                {
                  aef: "392ejkls",
                },
              ],
            },
          ],
        },
        {
          name: "test 2",
          exportName: "default",
          cases: [
            {
              name: "test",
              functionUnderTest: "injectFunction default",
              in: [
                {
                  aef: "392ejkls",
                },
              ],
            },
          ],
        },
      ],
    };

    const testConfigWithInjectedFunctions = injectFunctions(module, testConfig);
    expect(testConfigWithInjectedFunctions).toEqual(expected);
  });
});

describe("parseYamlDocuments", () => {
  test("should parse YAML with document separators", () => {
    const yamlContent = `file: './math.js'
group: math
suites: [add, increment]
---
suite: add
exportName: add
---
case: add 1 and 2
in:
  - 1
  - 2
out: 3
---
case: add 2 and 2
in:
  - 2
  - 2
out: 4
---
suite: increment
exportName: default
---
case: increment 1
in:
  - 1
out: 2
---
case: increment 2
in:
  - 2
out: 3`;

    const expected = {
      file: "./math.js",
      group: "math",
      suiteNames: ["add", "increment"],
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
              name: "add 2 and 2",
              in: [2, 2],
              out: 4,
            },
          ],
        },
        {
          name: "increment",
          exportName: "default",
          cases: [
            {
              name: "increment 1",
              in: [1],
              out: 2,
            },
            {
              name: "increment 2",
              in: [2],
              out: 3,
            },
          ],
        },
      ],
    };

    const result = parseYamlDocuments(yamlContent);
    expect(result).toEqual(expected);
  });

  test("should handle missing optional fields", () => {
    const yamlContent = `file: './simple.js'
group: simple
---
suite: test
---
case: test case
in: []
out: undefined`;

    const expected = {
      file: "./simple.js",
      group: "simple",
      suites: [
        {
          name: "test",
          exportName: "test",
          cases: [
            {
              name: "test case",
              in: [],
              out: "undefined",
            },
          ],
        },
      ],
    };

    const result = parseYamlDocuments(yamlContent);
    expect(result).toEqual(expected);
  });

  test("should handle YAML comments", () => {
    const yamlContent = `file: './math.js'
group: math
---
### Addition tests
suite: add
exportName: add
---
case: simple addition
in: [1, 2]
out: 3`;

    const expected = {
      file: "./math.js",
      group: "math",
      suites: [
        {
          name: "add",
          exportName: "add",
          cases: [
            {
              name: "simple addition",
              in: [1, 2],
              out: 3,
            },
          ],
        },
      ],
    };

    const result = parseYamlDocuments(yamlContent);
    expect(result).toEqual(expected);
  });
});
