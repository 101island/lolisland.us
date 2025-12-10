/**
 * 鼠标交互系统
 * 负责处理鼠标对弹珠的力场效果（推开/吸引）
 */

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
	attractRadius: number; // 吸引半径
	repelRadius: number; // 排斥半径
	repelForce: number; // 排斥力度
	attractForce: number; // 吸引力度
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

	/**
	 * 初始化鼠标交互监听器
	 */
	public init(): void {
		window.addEventListener("mousemove", (e) => {
			this.mouseX = e.clientX;
			this.mouseY = e.clientY;
			// 实时同步 Shift 键状态，防止状态不一致
			this.isShiftPressed = e.shiftKey;
			// 标记鼠标正在移动
			this.isMoving = true;
			this.lastMoveTime = performance.now();
		});

		window.addEventListener("keydown", (e) => {
			if (e.key === "Shift") this.isShiftPressed = true;
		});

		window.addEventListener("keyup", (e) => {
			if (e.key === "Shift") this.isShiftPressed = false;
		});

		// 窗口失焦时重置状态，防止状态卡住
		window.addEventListener("blur", () => {
			this.isShiftPressed = false;
		});

		// 页面隐藏时重置状态
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				this.isShiftPressed = false;
			}
		});
	}

	/**
	 * 判断是否应该对弹珠应用力场
	 * @param marble 弹珠对象
	 * @returns 是否应用力场
	 */
	public shouldApplyForce(marble: Marble): boolean {
		// 检查鼠标是否在最近移动过（300ms 内）
		const now = performance.now();
		if (now - this.lastMoveTime > 300) {
			this.isMoving = false;
		}

		// 只有鼠标移动时才应用力场
		if (!this.isMoving) {
			return false;
		}

		const dx = marble.x - this.mouseX;
		const dy = marble.y - this.mouseY;
		const dist = Math.hypot(dx, dy);

		// 如果鼠标悬停在弹珠上，不应用力场（允许点击链接）
		if (dist <= marble.radius) {
			return false;
		}

		// 检查是否在力场影响半径内
		const { attractRadius, repelRadius } = this.config;
		const interactRadius = this.isShiftPressed ? attractRadius : repelRadius;

		// 只有在影响半径内才应用力场
		return dist < interactRadius;
	}

	/**
	 * 获取力场是否激活
	 */
	public isForceFieldActive(): boolean {
		const now = performance.now();
		return this.isMoving && now - this.lastMoveTime <= 300;
	}

	/**
	 * 应用鼠标力场效果
	 * 注意：此函数应该只在 shouldApplyForce 返回 true 时调用
	 * @param marble 弹珠对象
	 * @param dt 时间增量
	 */
	public applyForce(marble: Marble, dt: number): void {
		// 在函数开始时固定状态，避免执行过程中状态变化
		const isAttractMode = this.isShiftPressed;
		const { attractRadius, repelRadius, repelForce, attractForce } =
			this.config;

		const dx = marble.x - this.mouseX;
		const dy = marble.y - this.mouseY;
		const dist = Math.hypot(dx, dy) || 0.001; // 防止除零

		// 根据模式选择不同的半径和力度
		const interactRadius = isAttractMode ? attractRadius : repelRadius;
		const force = isAttractMode ? attractForce : repelForce;

		// 使用对数衰减曲线：-log(t + 0.1)，非常柔和的过渡
		const t = dist / interactRadius;
		const strength = -Math.log(t * 0.9 + 0.1) * force * dt;
		const angle = Math.atan2(dy, dx);

		if (isAttractMode) {
			// Shift 键：吸引模式（拉向鼠标）
			marble.vx -= Math.cos(angle) * strength;
			marble.vy -= Math.sin(angle) * strength;
		} else {
			// 默认：排斥模式（推开）
			marble.vx += Math.cos(angle) * strength;
			marble.vy += Math.sin(angle) * strength;
		}
		// 注意：速度限制已在物理系统中统一处理
	}

	/**
	 * 更新配置
	 * @param config 新的配置
	 */
	public updateConfig(config: Partial<MouseInteractionConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * 获取当前鼠标位置
	 */
	public getMousePosition(): { x: number; y: number } {
		return { x: this.mouseX, y: this.mouseY };
	}

	/**
	 * 获取是否按住 Shift 键
	 */
	public isAttractMode(): boolean {
		return this.isShiftPressed;
	}
}
