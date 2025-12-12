// Mouse interaction system: Handles force field effects of mouse on marbles (repel/attract)

export interface Marble {
  id: string;
  node: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
}

export interface MouseInteractionConfig {
  attractRadius: number; // Attraction radius
  repelRadius: number; // Repulsion radius
  repelForce: number; // Repulsion force
  attractForce: number; // Attraction force
}

export class MouseInteraction {
  private mouseX: number = -1145;
  private mouseY: number = -1145;
  private isShiftPressed: boolean = false;
  private lastMoveTime: number = 0;
  private isMoving: boolean = false;
  private config: MouseInteractionConfig;

  constructor(config: MouseInteractionConfig) {
    this.config = config;
  }

  // Initialize mouse interaction listeners
  public init(): void {
    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      // Sync Shift key state in real-time to prevent state inconsistency
      this.isShiftPressed = e.shiftKey;
      // Mark mouse as moving
      this.isMoving = true;
      this.lastMoveTime = performance.now();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Shift") this.isShiftPressed = true;
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "Shift") this.isShiftPressed = false;
    });

    // Reset state when window loses focus to prevent stuck state
    window.addEventListener("blur", () => {
      this.isShiftPressed = false;
    });

    // Reset state when page is hidden
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.isShiftPressed = false;
      }
    });
  }

  // Determine if force field should be applied to marble
  public shouldApplyForce(marble: Marble): boolean {
    // Check if mouse moved recently (within 300ms)
    const now = performance.now();
    if (now - this.lastMoveTime > 300) {
      this.isMoving = false;
    }

    // Only apply force field when mouse is moving
    if (!this.isMoving) {
      return false;
    }

    const dx = marble.x - this.mouseX;
    const dy = marble.y - this.mouseY;
    const dist = Math.hypot(dx, dy);

    // If mouse hovers over marble, do not apply force field (allow clicking links)
    if (dist <= marble.radius) {
      return false;
    }

    // Check if within force field influence radius
    const { attractRadius, repelRadius } = this.config;
    const interactRadius = this.isShiftPressed ? attractRadius : repelRadius;

    // Only apply force field if within influence radius
    return dist < interactRadius;
  }

  // Get whether force field is active
  public isForceFieldActive(): boolean {
    const now = performance.now();
    return this.isMoving && now - this.lastMoveTime <= 300;
  }

  // Apply mouse force field effect (Note: This function should only be called when shouldApplyForce returns true)
  public applyForce(marble: Marble, dt: number): void {
    // Fix state at the start of function to avoid state change during execution
    const isAttractMode = this.isShiftPressed;
    const { attractRadius, repelRadius, repelForce, attractForce } = this.config;

    const dx = marble.x - this.mouseX;
    const dy = marble.y - this.mouseY;
    const dist = Math.hypot(dx, dy) || 0.001; // Prevent division by zero

    // Select different radius and force based on mode
    const interactRadius = isAttractMode ? attractRadius : repelRadius;
    const force = isAttractMode ? attractForce : repelForce;

    // Use logarithmic decay curve: -log(t + 0.1), very smooth transition
    const t = dist / interactRadius;
    const strength = -Math.log(t * 0.9 + 0.1) * force * dt;
    const angle = Math.atan2(dy, dx);

    if (isAttractMode) {
      // Shift key: Attraction mode (pull towards mouse)
      marble.vx -= Math.cos(angle) * strength;
      marble.vy -= Math.sin(angle) * strength;
    } else {
      // Default: Repulsion mode (push away)
      marble.vx += Math.cos(angle) * strength;
      marble.vy += Math.sin(angle) * strength;
    }
    // Note: Speed limits are handled uniformly in the physics system
  }

  // Update configuration
  public updateConfig(config: Partial<MouseInteractionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current mouse position
  public getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  // Get if Shift key is pressed
  public isAttractMode(): boolean {
    return this.isShiftPressed;
  }
}
