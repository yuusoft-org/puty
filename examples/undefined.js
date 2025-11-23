export function returnsUndefined() {
  // Returns undefined implicitly
}

export function returnsNull() {
  return null;
}

export function returnsValue() {
  return 42;
}

export function getNestedData() {
  return {
    prop1: undefined,
    prop2: "defined",
    nested: {
      value1: undefined,
      value2: 42,
      deep: {
        undefinedValue: undefined
      }
    }
  };
}

export function getArrayWithUndefined() {
  return [
    1,
    undefined,
    { nested: undefined },
    "defined"
  ];
}
