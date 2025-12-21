// Marble system manager: Integrates all subsystems and provides a unified API

import type { UserEntry } from "../config/marbleConfig";
import { MARBLE_CONFIG } from "../config/marbleConfig";
import { DeviceOrientationInteraction } from "./deviceOrientationInteraction";
import { DeviceMotionInteraction } from "./deviceMotionInteraction";
import { AnimationLoop } from "./animationLoop";
import { MarbleFactory } from "./marbleFactory";
import { MarblePhysics } from "./marblePhysics";
import type { Marble, MouseInteractionConfig } from "./mouseInteraction";
import { MouseInteraction } from "./mouseInteraction";

export interface MarbleSystemConfig {
  container: HTMLElement;
  fieldWidth: number;
  fieldHeight: number;
  mouseInteractionConfig?: {
    attractRadius?: number;
    repelRadius?: number;
    repelForce?: number;
    attractForce?: number;
  };
  deviceOrientationConfig?: {
    sensitivity?: number;
    maxForce?: number;
    enable?: boolean;
  };
  deviceMotionConfig?: {
    sensitivity?: number;
    maxForce?: number;
    enable?: boolean;
  };
}

export class MarbleSystem {
  private container: HTMLElement;
  private marbles: Marble[] = [];

  // Mouse interaction enabled state
  private mouseInteractionEnabled: boolean = true;

  // Subsystems
  private mouseInteraction: MouseInteraction;
  private deviceOrientationInteraction: DeviceOrientationInteraction;
  private deviceMotionInteraction: DeviceMotionInteraction;
  private physics: MarblePhysics;
  private factory: MarbleFactory;
  private animationLoop: AnimationLoop;

  // Field dimensions
  private fieldWidth: number;
  private fieldHeight: number;

  // Debug mode
  private debugMode: boolean = false;
  private debugCanvas: HTMLCanvasElement | null = null;
  private debugVectorScale: number = 0.5;

  constructor(config: MarbleSystemConfig) {
    this.container = config.container;
    this.fieldWidth = config.fieldWidth;
    this.fieldHeight = config.fieldHeight;

    // MouseInteraction Init
    const mouseConfig: MouseInteractionConfig = {
      attractRadius:
        config.mouseInteractionConfig?.attractRadius ??
        MARBLE_CONFIG.mouseInteraction.attractRadius,
      repelRadius:
        config.mouseInteractionConfig?.repelRadius ??
        MARBLE_CONFIG.mouseInteraction.repelRadius,
      repelForce:
        config.mouseInteractionConfig?.repelForce ??
        MARBLE_CONFIG.mouseInteraction.repelForce,
      attractForce:
        config.mouseInteractionConfig?.attractForce ??
        MARBLE_CONFIG.mouseInteraction.attractForce,
    };
    this.mouseInteraction = new MouseInteraction(mouseConfig);
    this.mouseInteraction.init();

    // DeviceOrientationInteraction Init
    this.deviceOrientationInteraction = new DeviceOrientationInteraction({
      sensitivity:
        config.deviceOrientationConfig?.sensitivity ??
        MARBLE_CONFIG.deviceOrientation.sensitivity,
      maxForce:
        config.deviceOrientationConfig?.maxForce ??
        MARBLE_CONFIG.deviceOrientation.maxForce,
      enable:
        config.deviceOrientationConfig?.enable ??
        MARBLE_CONFIG.deviceOrientation.enable,
    });

    this.deviceOrientationInteraction.init();

    // DeviceMotionInteraction Init
    this.deviceMotionInteraction = new DeviceMotionInteraction({
      sensitivity:
        config.deviceMotionConfig?.sensitivity ??
        MARBLE_CONFIG.deviceMotion.sensitivity,
      maxForce:
        config.deviceMotionConfig?.maxForce ??
        MARBLE_CONFIG.deviceMotion.maxForce,
      enable:
        config.deviceMotionConfig?.enable ?? MARBLE_CONFIG.deviceMotion.enable,
    });
    this.deviceMotionInteraction.init();

    // MarblePhysics Init
    this.physics = new MarblePhysics({
      fieldWidth: this.fieldWidth,
      fieldHeight: this.fieldHeight,
      damping: MARBLE_CONFIG.physics.damping,
      restitution: MARBLE_CONFIG.physics.restitution,
      wallBounce: MARBLE_CONFIG.physics.wallBounce,
      minSpeed: MARBLE_CONFIG.physics.minSpeed,
      maxSpeed: MARBLE_CONFIG.physics.maxSpeed,
      debugCanvas: this.debugCanvas,
      debugVectorScale: this.debugVectorScale,
    });

    // MarbleFactory Init
    this.factory = new MarbleFactory(
      this.container,
      this.fieldWidth,
      this.fieldHeight,
    );

    // AnimationLoop Init
    this.animationLoop = new AnimationLoop(
      this.update.bind(this),
      MARBLE_CONFIG.animation.fixedDeltaTime,
      MARBLE_CONFIG.animation.maxFrameTime,
    );

    // Setup window resize handler
    this.setupResizeHandler();
  }

  private currentSubSteps: number = 1;

  // Per-frame update logic
  private update(dt: number): void {
    let subSteps = 1;

    if (
      this.deviceOrientationInteraction.hasActiveGravity() &&
      this.deviceOrientationInteraction.getEnabled()
    ) {
      const { x, y } = this.deviceOrientationInteraction.getAcceleration();
      const magnitude = Math.hypot(x, y);

      // Dynamically adjust sub-steps based on gravity intensity
      // Theory: Less gravity = less force clamping marbles against walls = less tunneling risk
      if (magnitude < 2.0) {
        subSteps = 1;
      } else if (magnitude < 5.0) {
        subSteps = 3;
      } else {
        subSteps = 6;
      }

      const maxMagnitude = 7.0;
      const exponent = 3;
      const t = Math.min(magnitude / maxMagnitude, 1.0);
      const factor = 1 - (2 * t) ** exponent;
      const minSpeed = MARBLE_CONFIG.physics.minSpeed * Math.max(0, factor);
      this.physics.updateConfig({ minSpeed: minSpeed });
    } else {
      this.physics.updateConfig({ minSpeed: MARBLE_CONFIG.physics.minSpeed });
    }

    this.currentSubSteps = subSteps;
    const subDt = dt / subSteps;

    for (let i = 0; i < subSteps; i++) {
      // Apply mouse force field
      if (this.mouseInteractionEnabled) {     //mouse-interaction-trigger controll
        for (const marble of this.marbles) {
          if (this.mouseInteraction.shouldApplyForce(marble)) {
            this.mouseInteraction.applyForce(marble, subDt);
          }
        }
      }

      // Apply device orientation force
      if (this.deviceOrientationInteraction.isActivated()) {
        this.deviceOrientationInteraction.applyForce(this.marbles, subDt);
      }

      // Apply device motion force
      if (this.deviceMotionInteraction.isActivated()) {
        this.deviceMotionInteraction.applyForce(this.marbles, subDt);
      }

      // Update physics
      this.physics.updatePositions(this.marbles, subDt);
      this.physics.handleCollisions(this.marbles);
      this.physics.resolveVelocities(this.marbles, subDt);
    }

    this.physics.render(this.marbles);

    // Render debug vectors if enabled
    if (this.debugMode) {
      this.physics.renderDebugVectors(this.marbles);
    }
  }

  // Set up window resize listener
  private setupResizeHandler(): void {
    window.addEventListener("resize", () => {
      this.fieldWidth = window.innerWidth;
      this.fieldHeight = window.innerHeight;
      this.physics.updateConfig({
        fieldWidth: this.fieldWidth,
        fieldHeight: this.fieldHeight,
      });
      this.factory.updateFieldSize(this.fieldWidth, this.fieldHeight);

      if (this.debugCanvas) {
        this.debugCanvas.width = this.fieldWidth;
        this.debugCanvas.height = this.fieldHeight;
      }
    });
  }

  // Add a single marble
  public async addMarble(entry: UserEntry): Promise<Marble> {
    const marble = await this.factory.createMarble(entry);
    this.marbles.push(marble);
    return marble;
  }

  // Batch add marbles
  public async addMarbles(entries: UserEntry[]): Promise<Marble[]> {
    const newMarbles = await this.factory.createMarbles(entries);
    this.marbles.push(...newMarbles);
    return newMarbles;
  }

  // Remove marble
  public removeMarble(marbleId: string): boolean {
    const index = this.marbles.findIndex((m) => m.id === marbleId);
    if (index === -1) return false;

    const marble = this.marbles[index];
    marble.node.remove();
    this.marbles.splice(index, 1);
    return true;
  }

  // Clear all marbles
  public clear(): void {
    for (const marble of this.marbles) {
      marble.node.remove();
    }
    this.marbles = [];
  }

  // Start animation
  public start(): void {
    this.animationLoop.start();
  }

  // Stop animation
  public stop(): void {
    this.animationLoop.stop();
  }

  // Pause animation
  public pause(): void {
    this.animationLoop.pause();
  }

  // Resume animation
  public resume(): void {
    this.animationLoop.resume();
  }

  // Get all marbles
  public getMarbles(): ReadonlyArray<Marble> {
    return this.marbles;
  }

  // Get marble count
  public getMarbleCount(): number {
    return this.marbles.length;
  }

  public getKineticEnergy(): number {
    let totalKineticEnergy = 0;
    for (const m of this.marbles) {
      const speedSq = m.vx * m.vx + m.vy * m.vy;
      const energy = 0.5 * m.mass * speedSq;
      totalKineticEnergy += energy;
    }
    return totalKineticEnergy;
  }

  // Update marble size (zoom)
  public updateMarbleSize(zoomLevel: number): void {
    this.factory.setZoomLevel(zoomLevel);
    const size = this.factory.calculateMarbleSize();
    const radius = size / 2;

    for (const m of this.marbles) {
      m.radius = radius;
      m.node.style.width = `${size}px`;
      m.node.style.height = `${size}px`;
      // Recalculate mass
      const { massScale, massOffset } = MARBLE_CONFIG.physics;
      m.mass = radius * radius * massScale + massOffset;
    }
  }

  /**
   * Request device motion permission
   */
  public async requestDeviceOrientationPermission(): Promise<boolean> {
    return this.deviceOrientationInteraction.requestPermission();
  }

  public async requestDeviceMotionPermission(): Promise<boolean> {
    return this.deviceMotionInteraction.requestPermission();
  }

  /**
   * Get device motion debug info see also MainView.astro
   */
  public getAllDebugInfo() {
    return {
      ...this.deviceOrientationInteraction.getDebugInfo(),
      ...this.deviceMotionInteraction.getDebugInfo(),
      subSteps: this.currentSubSteps,
      kineticEnergy: this.getKineticEnergy(),
      minSpeed: this.physics.getConfig().minSpeed,
    };
  }

  // Destroy system
  public destroy(): void {
    this.stop();
    this.clear();
  }

  // Toggle collision
  public setCollisions(enabled: boolean): void {
    this.physics.updateConfig({ enableCollisions: enabled });
    this.physics.addRandomSpeed(this.marbles);
  }

  // Toggle device motion
  public setDeviceMotion(enabled: boolean): void {
    this.deviceMotionInteraction.updateConfig({ enable: enabled });
  }

  // Toggle device orientation
  public setDeviceOrientation(enabled: boolean): void {
    this.deviceOrientationInteraction.updateConfig({ enable: enabled });
  }

  // Toggle mouse interaction
  public setMouseInteraction(enabled: boolean): void {
    this.mouseInteractionEnabled = enabled;
  }

  // Toggle debug mode (show velocity vectors)
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;

    if (enabled) {
      // Get canvas from DOM if not already cached
      if (!this.debugCanvas) {
        this.debugCanvas = document.getElementById(
          "debug-velocity-canvas",
        ) as HTMLCanvasElement | null;
      }

      if (this.debugCanvas) {
        // Show canvas and configure physics
        this.debugCanvas.style.display = "block";
        this.debugCanvas.width = this.fieldWidth;
        this.debugCanvas.height = this.fieldHeight;
        this.physics.updateConfig({ debugCanvas: this.debugCanvas });
      }
    } else {
      if (this.debugCanvas) {
        // Hide canvas and clear
        this.debugCanvas.style.display = "none";
        const ctx = this.debugCanvas.getContext("2d");
        if (ctx)
          ctx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
      }
      this.physics.updateConfig({ debugCanvas: null });
    }
  }

  // Get debug mode status
  public isDebugMode(): boolean {
    return this.debugMode;
  }
}
