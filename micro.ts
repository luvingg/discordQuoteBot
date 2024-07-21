import { group, bench, run, baseline } from "mitata";

group("array mutation loop", () => {
  bench("for loop", () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);

    for (let i = 0; i < arr.length; i++) {
      arr[i] = arr[i] * 2;
    }
  });

  bench("forEach", () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);

    arr.forEach((_, i) => {
      arr[i] = arr[i] * 2;
    });
  });

  baseline("map", () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);

    arr.map((v) => v * 2);
  });

  bench("for of", () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);

    for (const [i, v] of arr.entries()) {
      arr[i] = v * 2;
    }
  });

  bench("for in", () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);

    for (const i in arr) {
      arr[i] = arr[i] * 2;
    }
  });
});

run();
