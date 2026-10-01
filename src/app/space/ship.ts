/**
 * The little rocket, drawn nose-first along +x at the current origin.
 * Callers translate and rotate the context to place it. `time` is in seconds
 * and only drives the exhaust flicker.
 */
export function drawShip(ctx: CanvasRenderingContext2D, time: number): void {
  // Exhaust first, so the hull paints over its root.
  const flame = 13 + Math.sin(time * 22) * 4;
  const plume = ctx.createLinearGradient(-9, 0, -9 - flame, 0);
  plume.addColorStop(0, 'rgba(255, 214, 130, 0.95)');
  plume.addColorStop(0.45, 'rgba(255, 138, 46, 0.6)');
  plume.addColorStop(1, 'rgba(255, 108, 32, 0)');
  ctx.fillStyle = plume;
  ctx.beginPath();
  ctx.moveTo(-9, -3.4);
  ctx.lineTo(-9 - flame, 0);
  ctx.lineTo(-9, 3.4);
  ctx.closePath();
  ctx.fill();

  // Fins.
  ctx.fillStyle = 'rgba(196, 84, 74, 0.95)';
  ctx.beginPath();
  ctx.moveTo(-7, -3);
  ctx.lineTo(-13, -8.5);
  ctx.lineTo(-5, -3);
  ctx.closePath();
  ctx.moveTo(-7, 3);
  ctx.lineTo(-13, 8.5);
  ctx.lineTo(-5, 3);
  ctx.closePath();
  ctx.fill();

  // Hull: a nose cone tapering back to the engine.
  ctx.fillStyle = 'rgba(226, 232, 246, 0.96)';
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.quadraticCurveTo(6, -5.4, -9, -4.2);
  ctx.lineTo(-9, 4.2);
  ctx.quadraticCurveTo(6, 5.4, 17, 0);
  ctx.closePath();
  ctx.fill();

  // Porthole.
  ctx.fillStyle = 'rgba(0, 180, 216, 0.95)';
  ctx.beginPath();
  ctx.arc(4.5, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
}
