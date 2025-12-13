// Animation loop manager: Semi-fixed time stepping method using fixed time step

export type UpdateCallback = (dt: number) => void;

export class AnimationLoop {
  private updateCallback: UpdateCallback;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private animationFrameId: number | null = null;

  private fixedDeltaTime: number;
  private maxFrameTime: number;

  constructor(
    updateCallback: UpdateCallback,
    fixedDeltaTime: number = 1 / 60,
    maxFrameTime: number = 0.1,
  ) {
    this.updateCallback = updateCallback;
    this.fixedDeltaTime = fixedDeltaTime;
    this.maxFrameTime = maxFrameTime;
  }

  // Animation loop logic
  private loop = (nowMs: number): void => {
    if (!this.isRunning) return;

    const now = nowMs / 1000;
    let frameTime = now - this.lastTime;

    // Prevent huge time jumps after long pauses (triggered when switching tabs while idle)
    if (frameTime > this.maxFrameTime) {
      frameTime = this.maxFrameTime;
    }

    this.lastTime = now;
    this.accumulator += frameTime;

    // Update using fixed time step
    while (this.accumulator >= this.fixedDeltaTime) {
      this.updateCallback(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // Start animation loop
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  // Stop animation loop
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Pause animation loop
  public pause(): void {
    this.isRunning = false;
  }

  // Resume animation loop
  public resume(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now() / 1000;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  // Check if running
  public isActive(): boolean {
    return this.isRunning;
  }
}
