/**
 * 动画循环管理器
 * 使用固定时间步长的半固定时间步进法
 */

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
		maxFrameTime: number = 0.1
	) {
		this.updateCallback = updateCallback;
		this.fixedDeltaTime = fixedDeltaTime;
		this.maxFrameTime = maxFrameTime;
	}

	/**
	 * 动画循环逻辑
	 */
	private loop = (nowMs: number): void => {
		if (!this.isRunning) return;

		const now = nowMs / 1000;
		let frameTime = now - this.lastTime;

		// 防止长时间暂停后的巨大时间跳跃（闲置切换标签页时几率触发）
		if (frameTime > this.maxFrameTime) {
			frameTime = this.maxFrameTime;
		}

		this.lastTime = now;
		this.accumulator += frameTime;

		// 使用固定时间步长更新
		while (this.accumulator >= this.fixedDeltaTime) {
			this.updateCallback(this.fixedDeltaTime);
			this.accumulator -= this.fixedDeltaTime;
		}

		this.animationFrameId = requestAnimationFrame(this.loop);
	};

	/**
	 * 启动动画循环
	 */
	public start(): void {
		if (this.isRunning) return;

		this.isRunning = true;
		this.lastTime = performance.now() / 1000;
		this.accumulator = 0;
		this.animationFrameId = requestAnimationFrame(this.loop);
	}

	/**
	 * 停止动画循环
	 */
	public stop(): void {
		this.isRunning = false;
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	/**
	 * 暂停动画循环
	 */
	public pause(): void {
		this.isRunning = false;
	}

	/**
	 * 恢复动画循环
	 */
	public resume(): void {
		if (this.isRunning) return;

		this.isRunning = true;
		this.lastTime = performance.now() / 1000;
		this.animationFrameId = requestAnimationFrame(this.loop);
	}

	/**
	 * 检查是否正在运行
	 */
	public isActive(): boolean {
		return this.isRunning;
	}
}
