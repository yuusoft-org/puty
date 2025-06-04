# Puty: Pure Unit Test in Yaml

Write unit test specifications using YAML files, powered by vitest as the test runner.

## Installation

```bash
npm install puty
```

create a file in your project `puty.test.js`
```js
import { setupTestSuiteFromYaml } from "./puty.js";
await setupTestSuiteFromYaml();
```

This function will read for all `.spec.yaml` and `.test.yaml` files in the current directory and run the tests.

run

```
vitest
```

It should run all the tests in the file.

## Usage

### Testing Functions

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
  - `method` - Name of the method to call
  - `in` - Arguments to pass to the method
  - `out` - Expected return value (optional)
  - `asserts` - Assertions to run after the method call
    - Property assertions: Check instance properties
    - Method assertions: Call methods and check their return values

### Error Testing

You can test that functions or methods throw expected errors:

```yaml
case: divide by zero
in: [10, 0]
throws: "Division by zero"
```
