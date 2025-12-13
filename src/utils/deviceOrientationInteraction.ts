/**
 * Device orientation interaction system
 * Handles the effect of device tilt (gravity) on marbles
 */

import type { Marble } from "./mouseInteraction";

export interface DeviceOrientationConfig {
  sensitivity: number; // Can be used to scale gravity effect slightly, default 1
  maxForce?: number; // Not strictly needed for gravity, but can limit if physics goes crazy
}

export class DeviceOrientationInteraction {
  private ax: number = 0; // Acceleration on X (m/s^2)
  private ay: number = 0; // Acceleration on Y (m/s^2)
  private alpha: number | null = 0;
  private beta: number | null = 0;
  private gamma: number | null = 0;
  private isActive: boolean = false;
  private config: DeviceOrientationConfig;

  constructor(config: DeviceOrientationConfig) {
    this.config = config;
  }

  /**
   * Initialize device orientation listener
   */
  public init(): void {
    if (typeof window === "undefined") return;

    // Check if DeviceOrientationEvent is supported
    if (window.DeviceOrientationEvent) {
      window.addEventListener(
        "deviceorientation",
        this.handleOrientation.bind(this),
      );
      this.isActive = true;
    }
  }

  /**
   * Handle device orientation event
   * alpha: rotation around Z (compass heading) in degrees, range [0, 360)
   * beta: front-to-back tilt in degrees, range [-180, 180)
   * gamma: left-to-right tilt in degrees, range [-90, 90)
   */
  private handleOrientation(event: DeviceOrientationEvent): void {
    const { alpha, beta, gamma } = event;

    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;

    if (
      alpha === null ||
      beta === null ||
      gamma === null ||
      (alpha === 0 && beta === 90 && gamma === 0)
    )
      return;

    // Gravity constant
    const g = 9.8;
    const toRad = Math.PI / 180;

    this.ax = g * Math.sin(gamma * toRad) * Math.cos(beta * toRad);
    this.ay = g * Math.sin(beta * toRad);
  }

  public getDebugInfo() {
    return {
      active: this.isActive,
      supported: this.isSupported(),
      ax: this.ax.toFixed(2),
      ay: this.ay.toFixed(2),
      alpha: this.alpha?.toFixed(1),
      beta: this.beta?.toFixed(1),
      gamma: this.gamma?.toFixed(1),
    };
  }

  /**
   * Get whether supported and active
   */
  public isSupported(): boolean {
    return this.isActive;
  }

  /**
   * Request Permission (iOS 13+ need permission for DeviceOrientation too)
   */
  public async requestPermission(): Promise<boolean> {
    if (
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const response = await (
          DeviceOrientationEvent as any
        ).requestPermission();
        if (response === "granted") {
          this.init();
          return true;
        }
        return false;
      } catch (e) {
        console.error("DeviceOrientation permission error:", e);
        return false;
      }
    }
    this.init(); // Init anyway for non-iOS 13+
    return true;
  }

  /**
   * Check if gravity is active and significant
   */
  public hasActiveGravity(): boolean {
    return this.isActive && (this.ax !== 0 || this.ay !== 0);
  }

  /**
   * Get current acceleration vector
   */
  public getAcceleration(): { x: number; y: number } {
    return { x: this.ax, y: this.ay };
  }

  /**
   * Apply Force (Gravity)
   */
  public applyForce(marbles: Marble[], dt: number): void {
    if (!this.isActive) return;

    const { sensitivity } = this.config;

    // Apply sensitivity scaling if desired (default 1 simulates real gravity)
    const gx = this.ax * sensitivity;
    const gy = this.ay * sensitivity;

    // Apply to all marbles
    // v = v0 + at
    for (const m of marbles) {
      m.vx += gx * dt;
      m.vy += gy * dt;
    }
  }

  /**
   * Update Config
   */
  public updateConfig(config: Partial<DeviceOrientationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
