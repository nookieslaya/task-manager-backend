const isProduction = process.env.NODE_ENV === "production";

const logInfo = (...args) => {
  if (!isProduction) {
    console.log(...args);
  }
};

const logError = (...args) => {
  console.error(...args);
};

export { logInfo, logError };
