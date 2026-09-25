/**
 * Structural similarity (SSIM) between two grayscale images of the same size,
 * averaged over 8×8 windows (Wang et al., 2004; constants for 8-bit images).
 * 1 = identical. CLAUDE.md requires ≥ 0.98 for every lighter image variant.
 */
const WINDOW = 8;
const C1 = (0.01 * 255) ** 2;
const C2 = (0.03 * 255) ** 2;

function windowSsim(a: Uint8Array, b: Uint8Array, width: number, x0: number, y0: number): number {
  let sumA = 0;
  let sumB = 0;
  let sumAA = 0;
  let sumBB = 0;
  let sumAB = 0;
  for (let y = y0; y < y0 + WINDOW; y += 1) {
    for (let x = x0; x < x0 + WINDOW; x += 1) {
      const va = a[y * width + x] ?? 0;
      const vb = b[y * width + x] ?? 0;
      sumA += va;
      sumB += vb;
      sumAA += va * va;
      sumBB += vb * vb;
      sumAB += va * vb;
    }
  }
  const n = WINDOW * WINDOW;
  const meanA = sumA / n;
  const meanB = sumB / n;
  const varA = sumAA / n - meanA * meanA;
  const varB = sumBB / n - meanB * meanB;
  const cov = sumAB / n - meanA * meanB;
  return (
    ((2 * meanA * meanB + C1) * (2 * cov + C2)) /
    ((meanA * meanA + meanB * meanB + C1) * (varA + varB + C2))
  );
}

export function ssim(a: Uint8Array, b: Uint8Array, width: number, height: number): number {
  if (a.length !== width * height || b.length !== width * height) {
    throw new Error("SSIM needs two grayscale images of the declared size");
  }
  let total = 0;
  let windows = 0;
  for (let y = 0; y + WINDOW <= height; y += WINDOW) {
    for (let x = 0; x + WINDOW <= width; x += WINDOW) {
      total += windowSsim(a, b, width, x, y);
      windows += 1;
    }
  }
  return windows === 0 ? 1 : total / windows;
}
