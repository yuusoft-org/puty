/**
 * Advanced callback patterns for testing
 */

export class HttpClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.interceptors = {
      request: [],
      response: [],
      error: []
    };
  }

  // Interceptor pattern - multiple callbacks per hook
  onRequest(callback) {
    this.interceptors.request.push(callback);
  }

  onResponse(callback) {
    this.interceptors.response.push(callback);
  }

  onError(callback) {
    this.interceptors.error.push(callback);
  }

  get(url, options = {}) {
    const fullUrl = this.baseUrl + url;
    const requestConfig = { method: 'GET', url: fullUrl, ...options };

    // Call request interceptors
    for (const interceptor of this.interceptors.request) {
      interceptor(requestConfig);
    }

    // Simulate HTTP request
    if (url.includes('/error')) {
      const error = new Error('Network error');
      for (const interceptor of this.interceptors.error) {
        interceptor(error, requestConfig);
      }
      throw error;
    }

    const response = {
      status: 200,
      data: { message: 'success', url: fullUrl },
      config: requestConfig
    };

    // Call response interceptors
    for (const interceptor of this.interceptors.response) {
      interceptor(response);
    }

    return response;
  }
}

export class AsyncProcessor {
  constructor() {
    this.callbacks = {
      progress: null,
      complete: null,
      error: null
    };
  }

  // Progress callback pattern
  onProgress(callback) {
    this.callbacks.progress = callback;
    return this; // For chaining
  }

  onComplete(callback) {
    this.callbacks.complete = callback;
    return this;
  }

  onError(callback) {
    this.callbacks.error = callback;
    return this;
  }

  processItems(items) {
    const results = [];
    
    try {
      for (let i = 0; i < items.length; i++) {
        if (this.callbacks.progress) {
          this.callbacks.progress({
            current: i + 1,
            total: items.length,
            item: items[i],
            percent: Math.round(((i + 1) / items.length) * 100)
          });
        }

        // Process item
        
        if (items[i] === 'error') {
          throw new Error(`Failed to process item: ${items[i]}`);
        }
        
        results.push(`processed_${items[i]}`);
      }

      if (this.callbacks.complete) {
        this.callbacks.complete(results);
      }
      
      return results;
    } catch (error) {
      if (this.callbacks.error) {
        this.callbacks.error(error, results);
      }
      throw error;
    }
  }
}

export class FileWatcher {
  constructor(path) {
    this.path = path;
    this.listeners = new Map();
    this.isWatching = false;
  }

  // Event emitter pattern
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return this;
  }

  start() {
    this.isWatching = true;
    this.emit('start', this.path);
    
    // Emit ready immediately
    this.emit('ready', ['file1.txt', 'file2.txt']);
    
    return this;
  }

  stop() {
    this.isWatching = false;
    this.emit('stop', this.path);
    return this;
  }

  simulateChange(filename, eventType = 'change') {
    if (this.isWatching) {
      this.emit(eventType, filename, { size: 1024, mtime: new Date() });
    }
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(...args));
    }
  }
}