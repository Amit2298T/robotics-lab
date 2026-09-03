export const robotConfig = {
  id: "diff-drive-01",

  spawn: {
    position: [0, 0.42, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
  },

  chassis: {
    size: [0.9, 0.22, 1.15] as [number, number, number],
    mass: 3.5,
  },

  control: {
    defaultWheelSpeed: 10,
    maxWheelSpeed: 20,
  },

  wheels: {
    radius: 0.22,
    width: 0.12,
    mass: 0.25,
    offsetX: 0.5,
    positionY: -0.12,
    positionZ: 0,
  },

  caster: {
    radius: 0.09,
    position: [0, -0.11, 0.42] as [number, number, number],
  },
} as const;
