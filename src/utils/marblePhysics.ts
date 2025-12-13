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
  enableCollisions?: boolean; // Enable/Disable collisions
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
      enableCollisions: config.enableCollisions ?? true,
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

  // Handle collisions between marbles using Spatial Grid
  public handleCollisions(marbles: Marble[]): void {
    if (this.config.enableCollisions === false) return;

    const restitution = this.config.restitution ?? 1;
    const { fieldWidth, fieldHeight } = this.config;

    // 1. Determine grid cell size
    // Using the maximum diameter of any marble ensures we only need to check adjacent cells.
    // If marbles can vary wildly in size, this might need tuning, but max diameter is safe.
    let maxDiameter = 0;
    for (const m of marbles) {
      if (m.radius * 2 > maxDiameter) maxDiameter = m.radius * 2;
    }
    // Fallback if no marbles or something goes wrong
    if (maxDiameter === 0) return;

    const cellSize = maxDiameter;
    const gridWidth = Math.ceil(fieldWidth / cellSize);
    const gridHeight = Math.ceil(fieldHeight / cellSize);

    // 2. Build the grid
    // Map: cellIndex -> Particle[]
    const grid = new Map<number, Marble[]>();

    const getGridIndex = (x: number, y: number) => {
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      // Clamp to valid range to handle out-of-bounds marbles gracefully
      if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return -1;
      return gx + gy * gridWidth;
    };

    for (const m of marbles) {
      const index = getGridIndex(m.x, m.y);
      if (index === -1) continue; // Skip out of bounds marbles (handled by boundaries)

      if (!grid.has(index)) {
        grid.set(index, []);
      }
      grid.get(index)?.push(m);
    }

    // 3. Check collisions (Grid-based)
    // We iterate through each marble, find its cell, and check that cell + neighbors
    for (const i_marble of marbles) {
      const gx = Math.floor(i_marble.x / cellSize);
      const gy = Math.floor(i_marble.y / cellSize);

      // Check 3x3 neighbors (including own cell)
      // Optimization: We could only check "forward" cells to avoid double checks,
      // but since we need to resolve for both, and the grid logic is simpler to iterate neighbors:
      // Standard way to avoid double checking A vs B and B vs A is to check all neighbors
      // and only resolve if ID(A) < ID(B) or similar check.

      for (let nx = gx - 1; nx <= gx + 1; nx++) {
        for (let ny = gy - 1; ny <= gy + 1; ny++) {
          if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

          const neighborIndex = nx + ny * gridWidth;
          const cellMarbles = grid.get(neighborIndex);

          if (!cellMarbles) continue;

          for (const j_marble of cellMarbles) {
            // Avoid self-collision
            if (i_marble === j_marble) continue;

            // Avoid double checking: only check if index(i) < index(j)
            // But here we rely on the object content.
            // Since marbles is an array, we can check if marbles.indexOf(i) < marbles.indexOf(j)?
            // That's O(N) inside loop.
            // Instead, let's just do the check and rely on the fact that if we resolve A vs B,
            // we might resolve B vs A later.
            // Ideally: We iterate unique pairs.
            // Optimization: Only check half-neighborhood?
            // Or simpler: check all, but only act if i_marble.id < j_marble.id
            if (i_marble.id >= j_marble.id) continue;

            const a = i_marble;
            const b = j_marble;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;
            const minDist = a.radius + b.radius;
            const minDistSq = minDist * minDist;

            if (distSq < minDistSq) {
              const dist = Math.sqrt(distSq) || 0.001;
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
