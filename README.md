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

Get up and running with Puty in just a few minutes!

### Prerequisites

- Node.js with ES modules support
- Vitest installed in your project

### Step 1: Install Puty

```bash
npm install puty
```

### Step 2: Setup Your Project

Ensure your `package.json` has ES modules enabled:

```json
{
  "type": "module"
}
```

### Step 3: Create a Function to Test

Create `utils/validator.js`:

```js
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### Step 4: Create Your Test File

Create `validator.test.yaml`:

```yaml
file: './utils/validator.js'
group: validator
suites: [isValidEmail, capitalize]
---
suite: isValidEmail
exportName: isValidEmail
---
case: valid email should return true
in: ['user@example.com']
out: true
---
case: invalid email should return false
in: ['invalid-email']
out: false
---
case: empty string should return false
in: ['']
out: false
---
suite: capitalize
exportName: capitalize
---
case: capitalize first letter
in: ['hello']
out: 'Hello'
---
case: single letter
in: ['a']
out: 'A'
```

### Step 5: Create Test Runner

Create `puty.test.js`:

```js
import { setupTestSuiteFromYaml } from "puty";

// This will automatically find and run all *.test.yaml files
await setupTestSuiteFromYaml();
```

### Step 6: Run Your Tests

```bash
npx vitest
```

You should see output like:
```
✓ validator > isValidEmail > valid email should return true
✓ validator > isValidEmail > invalid email should return false
✓ validator > isValidEmail > empty string should return false
✓ validator > capitalize > capitalize first letter
✓ validator > capitalize > single letter
```

🎉 **That's it!** You've just created declarative tests using YAML instead of JavaScript.

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

## Real-World Examples

### Testing a User Service

```yaml
file: './services/userService.js'
group: UserService
suites: [crud-operations]
---
suite: crud-operations
exportName: UserService
mode: class
constructorArgs: [$mock:database]
---
case: create user successfully
executions:
  - method: createUser
    in: 
      - name: 'John Doe'
        email: 'john@example.com'
        age: 30
    out: 
      id: 1
      name: 'John Doe'
      email: 'john@example.com'
      age: 30
    asserts:
      - property: users.length
        op: eq
        value: 1
mocks:
  database:
    calls:
      - in: ['INSERT', { name: 'John Doe', email: 'john@example.com', age: 30 }]
        out: { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 }
---
case: handle duplicate email error
executions:
  - method: createUser
    in:
      - name: 'Jane Doe'
        email: 'existing@example.com'
    throws: 'Email already exists'
mocks:
  database:
    calls:
      - in: ['INSERT', { name: 'Jane Doe', email: 'existing@example.com' }]
        throws: 'DUPLICATE_EMAIL'
```

### Testing a Shopping Cart

```yaml
file: './models/shoppingCart.js'
group: ShoppingCart
suites: [cart-operations]
---
suite: cart-operations
mode: class
exportName: ShoppingCart
---
case: add items and calculate total
executions:
  - method: addItem
    in: 
      - id: 'PROD-001'
        name: 'Laptop'
        price: 999.99
        quantity: 1
  - method: addItem
    in:
      - id: 'PROD-002'
        name: 'Mouse'
        price: 29.99
        quantity: 2
  - method: getTotal
    out: 1059.97
  - method: getItemCount
    out: 3
    asserts:
      - property: items.length
        op: eq
        value: 2
---
case: apply discount code
executions:
  - method: addItem
    in: [{id: 'PROD-003', name: 'Keyboard', price: 79.99, quantity: 1}]
  - method: applyDiscount
    in: ['SAVE20']
    out: true
  - method: getTotal
    out: 63.99
    asserts:
      - property: discount
        op: eq
        value: 0.2
```

### Testing API Endpoints

```yaml
file: './api/weatherAPI.js'
group: WeatherAPI
mocks:
  httpClient:
    calls:
      - in: ['GET', 'https://api.weather.com/v1/current?city=London']
        out: { temp: 15, condition: 'cloudy', humidity: 65 }
---
suite: weather-fetching
exportName: WeatherAPI
---
case: fetch current weather
in: ['London', $mock:httpClient]
out:
  city: 'London'
  temperature: 15
  condition: 'cloudy'
  humidity: 65
---
case: handle API error gracefully
in: ['InvalidCity', $mock:httpClient]
throws: 'Weather data not available'
mocks:
  httpClient:
    calls:
      - in: ['GET', 'https://api.weather.com/v1/current?city=InvalidCity']
        throws: 'City not found'
```

## API Reference

### setupTestSuiteFromYaml(path?)

The main function to set up test suites from YAML files.

```js
import { setupTestSuiteFromYaml } from 'puty';

// Run all *.test.yaml files in the project
await setupTestSuiteFromYaml();

// Run a specific YAML file
await setupTestSuiteFromYaml('./tests/specific.test.yaml');
```

**Parameters:**
- `path` (optional): Path to a specific YAML test file. If omitted, runs all `*.test.yaml` files.

**Returns:** Promise that resolves when all test suites are set up.

## Best Practices

### 1. Organize Tests by Feature

```
tests/
├── auth/
│   ├── login.test.yaml
│   └── register.test.yaml
├── cart/
│   ├── add-items.test.yaml
│   └── checkout.test.yaml
└── shared/
    ├── test-data.yaml
    └── mocks.yaml
```

### 2. Use Descriptive Test Names

```yaml
# Good
case: should return user data when valid ID provided

# Less descriptive
case: test user fetch
```

### 3. Leverage !include for Shared Data

```yaml
# shared/users.yaml
validUser:
  name: 'Test User'
  email: 'test@example.com'
  age: 25

# auth/register.test.yaml
case: register valid user
in: 
  - !include ../shared/users.yaml#validUser
out: { success: true, userId: 123 }
```

### 4. Test Edge Cases

```yaml
case: handle empty array
in: [[]]
out: []
---
case: handle null values
in: [null]
throws: 'Cannot process null value'
---
case: handle very large numbers
in: [9007199254740991]
out: '9007199254740991'
```

### 5. Use Mocks Wisely

- Define mocks at the appropriate level (global, suite, or case)
- Verify mock calls to ensure correct integration
- Keep mock data realistic

## Troubleshooting

### Common Issues

#### "Cannot find module" Error

**Problem:** Vitest can't find your YAML test files.

**Solution:** Ensure your test runner file imports and calls `setupTestSuiteFromYaml()`:

```js
// puty.test.js
import { setupTestSuiteFromYaml } from "puty";
await setupTestSuiteFromYaml();
```

#### YAML Parsing Errors

**Problem:** Invalid YAML syntax.

**Solution:** 
- Check for proper indentation (use spaces, not tabs)
- Ensure strings with colons are quoted
- Validate YAML with an online parser

#### Mocks Not Working

**Problem:** Mock functions aren't being called.

**Solution:**
- Use `$mock:mockName` syntax in your input arguments
- Ensure mock is defined at the correct scope
- Check that mock call expectations match actual calls

#### Tests Not Re-running on YAML Changes

**Problem:** Vitest doesn't detect YAML file changes.

**Solution:** Add YAML files to Vitest config:

```js
// vitest.config.js
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

### Debug Mode

To see detailed test execution, run Vitest with verbose output:

```bash
vitest --reporter=verbose
```

## Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Include a minimal reproduction case
3. Describe expected vs actual behavior
4. Include your Node.js and Puty versions

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Run linting: `npm run lint`
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to your fork (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Development Setup

```bash
# Clone the repo
git clone https://github.com/yuusoft-org/puty.git
cd puty

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Check code formatting
npm run lint

# Fix formatting issues
npm run lint:fix
```

### Code Style

- Use ES modules syntax
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Write tests for new features

## License

Puty is [MIT licensed](LICENSE).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/yuusoft-org">Yuusoft</a>
</p>

