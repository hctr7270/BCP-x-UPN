export async function celebrate() {
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#002A8D", "#FF7800", "#10B981"], zIndex: 9999 });
}
