/**
 * Example event-driven class for testing callback mocking
 */

export class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  // Pattern 1: class.on('event', callback)
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(...args));
    }
  }

  doSomething() {
    this.emit('start', 'processing');
    // Simulate some work
    const result = 'completed';
    this.emit('finish', result, 42);
    return result;
  }

  processData(data) {
    this.emit('beforeProcess', data);
    const processed = data.toUpperCase();
    this.emit('afterProcess', processed);
    return processed;
  }
}

export class TaskManager {
  constructor() {
    this.callbacks = {};
  }

  // Pattern 2: class.onEvent(callback)
  onStart(callback) {
    this.callbacks.start = callback;
  }

  onComplete(callback) {
    this.callbacks.complete = callback;
  }

  onError(callback) {
    this.callbacks.error = callback;
  }

  executeTask(taskName) {
    if (this.callbacks.start) {
      this.callbacks.start(taskName);
    }

    // Simulate task execution
    if (taskName === 'fail') {
      if (this.callbacks.error) {
        this.callbacks.error('Task failed', taskName);
      }
      throw new Error('Task failed');
    }

    const result = `${taskName} completed`;
    if (this.callbacks.complete) {
      this.callbacks.complete(result, taskName);
    }
    return result;
  }

  runBatch(tasks) {
    const results = [];
    for (const task of tasks) {
      try {
        const result = this.executeTask(task);
        results.push(result);
      } catch (error) {
        // Error already handled by callback
        results.push(null);
      }
    }
    return results;
  }
}