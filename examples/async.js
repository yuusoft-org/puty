export const asyncAdd = async (a, b) => {
  await Promise.resolve();
  return a + b;
};

export const asyncNoReturn = async () => {};

export const asyncThrow = async () => {
  throw new Error("boom");
};

export const syncThrow = () => {
  throw new Error("sync boom");
};

export const runWithCallback = async (callback) => {
  await Promise.resolve();
  callback("done", 1);
  return { ok: true };
};

export const createAsyncCounter = async (start = 0) => {
  let value = start;

  return {
    getValue() {
      return value;
    },
    async increment(by = 1) {
      value += by;
      return value;
    },
    failSync() {
      throw new Error("counter failed sync");
    },
    async fail() {
      throw new Error("counter failed");
    },
  };
};

export class AsyncCounter {
  constructor(start = 0) {
    this.value = start;
  }

  async increment(by = 1) {
    this.value += by;
    return this.value;
  }

  getValue() {
    return this.value;
  }

  failSync() {
    throw new Error("class failed sync");
  }

  async fail() {
    throw new Error("class failed");
  }
}
