// Aggressive console suppression - must run before any other imports
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Suppress any logs containing these patterns
const suppressPatterns = ["Closing session", "SessionEntry"];

function shouldSuppress(args) {
  try {
    // Check first argument (string messages)
    if (typeof args[0] === "string") {
      for (const pattern of suppressPatterns) {
        if (args[0].includes(pattern)) {
          return true;
        }
      }
    }

    // Check if any argument when stringified contains the pattern
    const stringified = args
      .map((arg) => {
        try {
          return typeof arg === "string" ? arg : String(arg);
        } catch {
          return "";
        }
      })
      .join(" ");

    for (const pattern of suppressPatterns) {
      if (stringified.includes(pattern)) {
        return true;
      }
    }

    return false;
  } catch (err) {
    return false;
  }
}

console.log = function (...args) {
  if (shouldSuppress(args)) return;
  originalLog.apply(console, args);
};

console.error = function (...args) {
  if (shouldSuppress(args)) return;
  originalError.apply(console, args);
};

console.warn = function (...args) {
  if (shouldSuppress(args)) return;
  originalWarn.apply(console, args);
};
