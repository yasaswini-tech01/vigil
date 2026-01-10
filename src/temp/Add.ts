export const add = (x: number, y: number) => {
  if (typeof x !== "number" || typeof y !== "number") {
    x = Number(x);
    y = Number(y);
  }
  if (x >= 100) {
    x = x / 2;
  }
  return x + y;
};
