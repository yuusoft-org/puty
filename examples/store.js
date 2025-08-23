export function createStore(initialState) {
  let state = { ...initialState };
  
  return {
    dispatch(action) {
      switch (action.type) {
        case 'INCREMENT':
          state.count = (state.count || 0) + (action.payload || 1);
          break;
        case 'DECREMENT':
          state.count = (state.count || 0) - (action.payload || 1);
          break;
        case 'SET':
          state.count = action.payload;
          break;
      }
      return state.count;
    },
    
    getCount() {
      return state.count || 0;
    },
    
    getState() {
      return { ...state };
    }
  };
}

export function createCounter(start = 0) {
  let count = start;
  
  return {
    increment() {
      return ++count;
    },
    
    decrement() {
      return --count;
    },
    
    getValue() {
      return count;
    },
    
    reset() {
      count = start;
      return count;
    }
  };
}

export function returnsUndefined() {
  // This function returns undefined
}

export function sideEffectOnly(callback) {
  // This function has side effects but returns undefined
  if (callback) {
    callback('side effect executed');
  }
}

export function createApiWithUndefined() {
  return {
    doSomething() {
      // This method returns undefined
    },
    
    getValue() {
      return 42;
    },
    
    getNothing() {
      return undefined;
    }
  };
}