
class Math {
  count = 0;

  constructor(count = 0) {
    this.count = count;
  }

  getDoubleCount() {
    return this.count * 2;
  }

  increment(value) {
    this.count += value;
    return this.count;
  }
}

export default Math;

