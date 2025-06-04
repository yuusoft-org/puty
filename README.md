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
