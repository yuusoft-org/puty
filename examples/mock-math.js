/**
 * Example module with functions that have dependencies for mock testing
 */

export const calculateWithLogger = (a, b, logger) => {
  logger('info', `Calculating ${a} + ${b}`);
  const result = a + b;
  logger('debug', `Result: ${result}`);
  return result;
};

export const processData = (data, validator, transformer) => {
  if (!validator(data)) {
    throw new Error('Invalid data');
  }
  return transformer(data);
};

export const fetchAndProcess = async (url, fetcher, processor) => {
  const data = await fetcher(url);
  return processor(data);
};