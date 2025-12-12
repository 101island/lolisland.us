// Marble physics system: Handles marble movement, collision detection, and boundary processing

import type { Marble } from "./mouseInteraction";

export interface PhysicsConfig {
  fieldWidth: number;
  fieldHeight: number;
  damping?: number; // Air resistance coefficient
  restitution?: number; // Collision restitution coefficient
  wallBounce?: number; // Wall bounce coefficient
  minSpeed?: number; // Minimum speed
  maxSpeed?: number; // Maximum speed
}

export class MarblePhysics {
  private config: PhysicsConfig;

  constructor(config: PhysicsConfig) {
    this.config = {
      fieldWidth: config.fieldWidth,
      fieldHeight: config.fieldHeight,
      damping: config.damping ?? 0.9985,
      restitution: config.restitution ?? 0.92,
      wallBounce: config.wallBounce ?? 0.85,
      minSpeed: config.minSpeed ?? 30,
      maxSpeed: config.maxSpeed ?? 800,
    };
  }

  // Update marble positions
  public updatePositions(marbles: Marble[], dt: number): void {
    const { damping, minSpeed, maxSpeed } = this.config;

    for (const m of marbles) {
      // Apply air resistance
      if (damping !== undefined && damping < 1) {
        const dampingFactor = damping ** (dt * 60); // Frame rate independent
        m.vx *= dampingFactor;
        m.vy *= dampingFactor;
      }

      // Calculate current speed
      const speed = Math.hypot(m.vx, m.vy);

      // Maintain minimum speed (prevent complete stop)
      if (minSpeed !== undefined && speed > 0 && speed < minSpeed) {
        const scale = minSpeed / speed;
        m.vx *= scale;
        m.vy *= scale;
      }

      // Limit maximum speed
      if (maxSpeed !== undefined && speed > maxSpeed) {
        const scale = maxSpeed / speed;
        m.vx *= scale;
        m.vy *= scale;
      }

      // Update position
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    }
  }

  // Handle collisions between marbles
  public handleCollisions(marbles: Marble[]): void {
    const restitution = this.config.restitution ?? 1;

    for (let i = 0; i < marbles.length; i++) {
      for (let j = i + 1; j < marbles.length; j++) {
        const a = marbles[i];
        const b = marbles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const minDist = a.radius + b.radius;

        if (dist < minDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const relativeVelocity = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;

          if (relativeVelocity < 0) {
            // Calculate impulse using restitution coefficient
            const impulse =
              ((1 + restitution) * relativeVelocity) / (a.mass + b.mass);
            a.vx -= impulse * b.mass * nx;
            a.vy -= impulse * b.mass * ny;
            b.vx += impulse * a.mass * nx;
            b.vy += impulse * a.mass * ny;
          }

          // Position correction to prevent overlap
          const overlap = minDist - dist + 0.5;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
        }
      }
    }
  }

  // Handle boundary collisions
  public handleBoundaries(marbles: Marble[]): void {
    const { fieldWidth, fieldHeight, wallBounce } = this.config;
    const bounce = wallBounce ?? 1;

    for (const m of marbles) {
      // Left boundary
      if (m.x - m.radius < 0) {
        m.x = m.radius;
        if (m.vx < 0) m.vx *= -bounce;
      }
      // Right boundary
      if (m.x + m.radius > fieldWidth) {
        m.x = fieldWidth - m.radius;
        if (m.vx > 0) m.vx *= -bounce;
      }
      // Top boundary
      if (m.y - m.radius < 0) {
        m.y = m.radius;
        if (m.vy < 0) m.vy *= -bounce;
      }
      // Bottom boundary
      if (m.y + m.radius > fieldHeight) {
        m.y = fieldHeight - m.radius;
        if (m.vy > 0) m.vy *= -bounce;
      }
    }
  }

  // Render marbles to DOM
  public render(marbles: Marble[]): void {
    for (const m of marbles) {
      m.node.style.transform = `translate(${m.x - m.radius}px, ${m.y - m.radius}px)`;
    }
  }

  // Update configuration
  public updateConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  public getConfig(): PhysicsConfig {
    return { ...this.config };
  }
}
