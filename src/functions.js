export function escapeRegExp(string) {
  return string.replace(/[.*=+:\-?^${}()|[\]\\]|\s/g, "\\$&");
}

export function emojiStringToArray(str) {
  const spl = str.split(/([\uD800-\uDBFF][\uDC00-\uDFFF])/);
  const arr = [];
  for (let i = 0; i < spl.length; i++) {
    let char = spl[i];
    if (char !== "") {
      arr.push(char);
    }
  }
  return arr;
}

export function mathRandom(x) {
  return x[Math.floor(x.length * Math.random())];
}
