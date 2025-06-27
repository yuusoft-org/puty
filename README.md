# Puty: Pure Unit Test in YAML

Puty is a declarative testing framework that allows you to write unit tests using YAML files instead of JavaScript code. It's built on top of [Vitest](https://vitest.dev/) and designed to make testing more accessible and maintainable by separating test data from test logic.

Puty is ideal for testing pure functions - functions that always return the same output for the same input and have no side effects. The declarative YAML format perfectly captures the essence of pure function testing: given these inputs, expect this output.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Testing Functions](#testing-functions)
  - [Testing Classes](#testing-classes)
  - [Error Testing](#error-testing)
  - [Using Mocks](#using-mocks)
  - [Using !include Directive](#using-include-directive)
- [YAML Structure](#yaml-structure)

## Features

- 📝 Write tests in simple YAML format
- 📦 Modular test organization with `!include` directive
- 🎯 Clear separation of test data and test logic
- 🧪 Mock support for testing functions with dependencies
- ⚡ Powered by Vitest for fast test execution

## Installation

```bash
npm install puty
```

## Quick Start


1. Create a test runner file `puty.test.js` in your project:

```js
import { setupTestSuiteFromYaml } from "puty";

// Search for test files in the current directory
await setupTestSuiteFromYaml();

// Or specify a different directory
// await setupTestSuiteFromYaml("./tests");
```

**Note:** Puty uses ES module imports and requires your project to support ES modules. If you're using Node.js, make sure to add `"type": "module"` to your `package.json` or use `.mjs` file extensions.


2. Create your first test file `math.test.yaml`:

```yaml
file: './math.js'
group: math
suites: [add]
---
suite: add
exportName: add
---
case: add two numbers
in: [2, 3]
out: 5
```

3. Run your tests:

```bash
npx vitest
```

### Recommended Vitest Configuration

To enable automatic test reruns when YAML test files change, create a `vitest.config.js` file in your project root:

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    forceRerunTriggers: [
      '**/*.js',
      '**/*.{test,spec}.yaml',
      '**/*.{test,spec}.yml'
    ],
  },
});
```

This configuration ensures that Vitest will re-run your tests whenever you modify either your JavaScript source files or your YAML test files.

## Usage

### Testing Functions

Here's a complete example of testing JavaScript functions with Puty:

```yaml
file: './math.js'
group: math
suites: [add, increment]
---
### Add
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
### Increment
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
out: 3
```

This under the hood creates a test structure in Vitest like:
```js
describe('math', () => {
  describe('add', () => {
    it('add 1 and 2', () => { ... })
    it('add 2 and 2', () => { ... })
  })
  describe('increment', () => {
    it('increment 1', () => { ... })
    it('increment 2', () => { ... })
  })
})
```

See the [YAML Structure](#yaml-structure) section for detailed documentation of all available fields.

### Testing Classes

Puty also supports testing classes with method calls and state assertions:

```yaml
file: './calculator.js'
group: Calculator
suites: [basic-operations]
---
suite: basic-operations
mode: 'class'
exportName: default
constructorArgs: [10]  # Initial value
---
case: add and multiply operations
executions:
  - method: add
    in: [5]
    out: 15
    asserts:
      - property: value
        op: eq
        value: 15
  - method: multiply
    in: [2]
    out: 30
    asserts:
      - property: value
        op: eq
        value: 30
      - method: getValue
        in: []
        out: 30
```

#### Class Test Structure

- `mode: 'class'` - Indicates this suite tests a class
- `constructorArgs` - Arguments passed to the class constructor
- `executions` - Array of method calls to execute in sequence
  - `method` - Name of the method to call (supports nested: `user.api.getData`)
  - `in` - Arguments to pass to the method
  - `out` - Expected return value (optional)
  - `asserts` - Assertions to run after the method call
    - Property assertions: Check instance properties (supports nested: `user.profile.name`)
    - Method assertions: Call methods and check their return values (supports nested: `settings.getTheme`)

### Error Testing

You can test that functions or methods throw expected errors:

```yaml
case: divide by zero
in: [10, 0]
throws: "Division by zero"
```

### Using Mocks

Puty supports mocking dependencies using the `$mock:` syntax. This is useful for testing functions that have external dependencies like loggers, API clients, or callbacks.

#### Basic Mock Example

```yaml
file: './calculator.js'
group: calculator
---
suite: calculate
exportName: calculateWithLogger
---
case: test with mock logger
in:
  - 10
  - 5
  - $mock:logger
out: 15
mocks:
  logger:
    calls:
      - in: ['Calculating 10 + 5']
      - in: ['Result: 15']
```

#### Mock Hierarchy

Mocks can be defined at three levels (case overrides suite, suite overrides global):

```yaml
file: './service.js'
group: service
mocks:
  globalApi:    # Global mock - available to all suites
    calls:
      - in: ['/default']
        out: { status: 200 }
---
suite: userService
mocks:
  api:          # Suite mock - available to all cases in this suite
    calls:
      - in: ['/users']
        out: { users: [] }
---
case: get user with mock
in: [123, $mock:api]
out: { id: 123, name: 'John' }
mocks:
  api:          # Case mock - overrides suite mock
    calls:
      - in: ['/users/123']
        out: { id: 123, name: 'John' }
```

#### Testing Callbacks

Mocks are perfect for testing event-driven code:

```yaml
case: test event emitter
executions:
  - method: on
    in: ['data', $mock:callback]
  - method: emit
    in: ['data', 'hello']
mocks:
  callback:
    calls:
      - in: ['hello']
```

### Using !include Directive

Puty supports the `!include` directive to modularize and reuse YAML test files. This is useful for:
- Sharing common test data across multiple test files
- Organizing large test suites into smaller, manageable files
- Reusing test cases for different modules

#### Basic Usage

You can include entire YAML documents:

```yaml
file: "./math.js"
group: math-tests
suites: [add]
---
!include ./suite-definition.yaml
---
!include ./test-cases.yaml
```

#### Including Values

You can also include specific values within a YAML document:

```yaml
case: test with shared data
in: !include ./test-data/input.yaml
out: !include ./test-data/expected-output.yaml
```

#### Recursive Includes

The `!include` directive supports recursive includes, allowing included files to include other files:

```yaml
# main.yaml
!include ./level1.yaml

# level1.yaml
suite: test
---
!include ./level2.yaml

# level2.yaml
case: nested test
in: []
out: "success"
```

#### Important Notes

- File paths in `!include` are relative to the YAML file containing the directive
- Circular dependencies are detected and will cause an error
- Missing include files will result in a clear error message
- Both single documents and multi-document YAML files can be included


## YAML Structure

Puty test files use multi-document YAML format with three types of documents:

### 1. Configuration Document (First document)

```yaml
file: './module.js'        # Required: Path to JS file (relative to YAML file)
group: 'test-group'        # Required: Test group name (or use 'name')
suites: ['suite1', 'suite2'] # Optional: List of suites to define
mocks:                     # Optional: Global mocks available to all suites
  mockName:
    calls:
      - in: [args]
        out: result
```

### 2. Suite Definition Documents

```yaml
suite: 'suiteName'         # Required: Suite name
exportName: 'functionName' # Optional: Export to test (defaults to suite name or 'default')
mode: 'class'              # Optional: Set to 'class' for class testing
constructorArgs: [arg1]    # Optional: Arguments for class constructor (class mode only)
mocks:                     # Optional: Suite-level mocks for all cases in this suite
  mockName:
    calls:
      - in: [args]
        out: result
```

### 3. Test Case Documents

For function tests:
```yaml
case: 'test description'   # Required: Test case name
in: [arg1, arg2]          # Required: Input arguments (use $mock:name for mocks)
out: expectedValue        # Optional: Expected output (omit if testing for errors)
throws: 'Error message'   # Optional: Expected error message
mocks:                    # Optional: Case-specific mocks
  mockName:
    calls:                # Array of expected calls
      - in: [args]        # Expected arguments
        out: result       # Optional: Return value
        throws: 'error'   # Optional: Throw error instead
```

For class tests:
```yaml
case: 'test description'
executions:
  - method: 'methodName'        # Supports nested: 'user.api.getData'
    in: [arg1]
    out: expectedValue          # Optional
    throws: 'Error msg'         # Optional
    asserts:
      - property: 'prop'        # Supports nested: 'user.profile.name'
        op: 'eq'                # Currently only 'eq' is supported
        value: expected
      - method: 'getter'        # Supports nested: 'settings.ui.getTheme'
        in: []
        out: expected
mocks:                          # Optional: Mocks for the entire test case
  mockName:
    calls:
      - in: [args]
        out: result
```

#### Nested Properties and Methods

Puty supports accessing nested properties and calling nested methods using dot notation:

```yaml
case: 'test nested access'
executions:
  - method: 'settings.ui.setTheme'    # Call nested method
    in: ['dark']
    out: 'dark'
    asserts:
      - property: 'user.profile.name'    # Access nested property
        op: eq
        value: 'John Doe'
      - property: 'user.account.balance' # Deep nested property
        op: eq
        value: 100.50
      - method: 'api.client.get'         # Call nested method
        in: ['/users/123']
        out: 'GET /users/123'
```

