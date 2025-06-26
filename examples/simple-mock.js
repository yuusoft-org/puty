export const simpleAdd = (a, b, logger) => {
  if (logger) {
    logger('Adding numbers');
  }
  return a + b;
};