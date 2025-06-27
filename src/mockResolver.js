/**
 * @fileoverview Mock resolution and processing utilities
 * This module provides functions for resolving mock references, creating mock functions,
 * and validating mock calls in YAML-driven tests.
 */

import { vi } from "vitest";

/**
 * Deep equality check for mock argument validation
 * @param {any} a - First value to compare
 * @param {any} b - Second value to compare
 * @returns {boolean} True if values are deeply equal
 */
const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};

/**
 * Resolves mock references following hierarchy: case -> suite -> global
 * @param {Object} caseMocks - Case-level mock definitions
 * @param {Object} suiteMocks - Suite-level mock definitions
 * @param {Object} globalMocks - Global-level mock definitions
 * @returns {Object} Resolved mock definitions with hierarchy applied
 */
export const resolveMocks = (caseMocks = {}, suiteMocks = {}, globalMocks = {}) => {
  const resolved = {};
  
  // Apply hierarchy: global -> suite -> case (case overrides suite, suite overrides global)
  Object.assign(resolved, globalMocks, suiteMocks, caseMocks);
  
  return resolved;
};

/**
 * Recursively processes values, replacing $mock: references with mock functions
 * @param {any} value - Value to process (can be string, array, object, or primitive)
 * @param {Object} mockFunctions - Map of mock name to mock function wrapper
 * @returns {any} Processed value with $mock: references replaced
 */
export const processMockReferences = (value, mockFunctions) => {
  if (typeof value === 'string' && value.startsWith('$mock:')) {
    const mockName = value.substring(6); // Remove '$mock:' prefix
    if (!mockFunctions[mockName]) {
      throw new Error(`Mock '${mockName}' is referenced but not defined`);
    }
    return mockFunctions[mockName].mockFunction;
  }
  
  if (Array.isArray(value)) {
    return value.map(item => processMockReferences(item, mockFunctions));
  }
  
  if (value && typeof value === 'object') {
    const processed = {};
    for (const [key, val] of Object.entries(value)) {
      processed[key] = processMockReferences(val, mockFunctions);
    }
    return processed;
  }
  
  return value;
};

/**
 * Creates a mock function with call tracking and validation
 * @param {string} mockName - Name of the mock for error reporting
 * @param {Object} mockDefinition - Mock definition with calls array
 * @param {Array} mockDefinition.calls - Array of expected calls with in/out/throws
 * @returns {Object} Mock function wrapper with validation methods
 */
export const createMockFunction = (mockName, mockDefinition) => {
  const { calls } = mockDefinition;
  let callIndex = 0;
  
  const mockFn = vi.fn().mockImplementation((...args) => {
    if (callIndex >= calls.length) {
      throw new Error(`Mock '${mockName}' was called ${callIndex + 1} time(s) but expected exactly ${calls.length} calls`);
    }
    
    const expectedCall = calls[callIndex];
    
    // Validate input arguments
    if (!deepEqual(args, expectedCall.in)) {
      throw new Error(`Expected ${mockName}(${JSON.stringify(expectedCall.in)}) but got ${mockName}(${JSON.stringify(args)})`);
    }
    
    callIndex++;
    
    if (expectedCall.throws) {
      throw new Error(expectedCall.throws);
    }
    
    return expectedCall.out;
  });
  
  return {
    mockFunction: mockFn,
    expectedCalls: calls.length,
    actualCalls: () => callIndex,
    validate: () => {
      if (callIndex !== calls.length) {
        throw new Error(`Mock '${mockName}' was called ${callIndex} time(s) but expected exactly ${calls.length} calls`);
      }
    },
    mockName
  };
};

/**
 * Validates all mocks were called as expected
 * @param {Object} mockFunctions - Map of mock name to mock function wrapper
 * @throws {Error} If any mock validation fails
 */
export const validateMockCalls = (mockFunctions) => {
  for (const mockWrapper of Object.values(mockFunctions)) {
    mockWrapper.validate();
  }
};

/**
 * Creates mock functions from resolved mock definitions
 * @param {Object} resolvedMocks - Resolved mock definitions
 * @returns {Object} Map of mock name to mock function wrapper
 */
export const createMockFunctions = (resolvedMocks) => {
  const mockFunctions = {};
  
  for (const [mockName, mockDef] of Object.entries(resolvedMocks)) {
    mockFunctions[mockName] = createMockFunction(mockName, mockDef);
  }
  
  return mockFunctions;
};