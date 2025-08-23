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