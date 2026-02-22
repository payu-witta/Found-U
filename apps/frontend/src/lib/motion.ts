export const motionTiming = {
  fast: 0.2,
  base: 0.26,
  slow: 0.32,
} as const;

export const motionEase = {
  out: [0.22, 1, 0.36, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const,
} as const;

export const spring = {
  soft: { type: "spring", stiffness: 260, damping: 28, mass: 0.9 } as const,
  card: { type: "spring", stiffness: 300, damping: 30, mass: 0.8 } as const,
} as const;
