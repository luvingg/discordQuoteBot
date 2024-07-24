import { group, bench, run, baseline } from "mitata";
import { Canvas } from "skia-canvas";

const canvas = new Canvas(1920, 1080);
const ctx = canvas.getContext("2d");

group("canvas", () => {
  baseline("New Canvas", () => {
    new Canvas(1920, 1080);
  });
  bench("Clearing Canvas", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  bench("Reset Canvas", () => {
    ctx.reset();
  });
  bench("New Pages", () => {
    const ctx = canvas.newPage(1920, 1080);
  });
});
run();
