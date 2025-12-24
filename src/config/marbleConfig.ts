export interface UserEntry {
  name: string;
  id: string;
  link?: string;
}

export const MARBLE_CONFIG = {
  // Marble size configuration
  size: {
    base: 192,
    min: 96,
    marbleCount: 19,
    marbleArea: 0.5,
  },

  // Marble initial speed configuration
  speed: {
    min: 60,
    max: 150,
  },

  // Physics parameters
  physics: {
    massScale: 0.01,
    massOffset: 1,
    damping: 0.9985, // Air resistance/damping coefficient (0-1)
    restitution: 0.92, // Marble collision restitution coefficient (0-1)
    wallBounce: 0.85, // Wall bounce coefficient (0-1)
    minSpeed: 50, // Minimum speed threshold. Below this value, speed increases to this value: CurrentSpeed *= scale = minSpeed / speed
    maxSpeed: 3200, // Global maximum speed limit, limited in the same way as above
  },

  // Animation configuration
  animation: {
    fadeInDelay: 100,
    fixedDeltaTime: 1 / 60, // 60 FPS
    maxFrameTime: 0.1, // 100ms
  },

  // Mouse interaction configuration
  mouseInteraction: {
    attractRadius: 500, // Attraction radius
    repelRadius: 300, // Repulsion radius
    repelForce: 400, // Repulsion force
    attractForce: 600, // Attraction force
    enable: true,
  },
  // Device motion interaction configuration
  deviceOrientation: {
    sensitivity: 600, // Sensitivity
    maxForce: 6000, // Maximum force limit
    enable: true,
  },
  deviceMotion: {
    sensitivity: 600, // Sensitivity
    maxForce: 6000, // Maximum force limit
    enable: true,
  },
} as const;

export const AVATAR_BASE_URL = "https://avatar.awfufu.com/qq/";
