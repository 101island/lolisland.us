export interface UserEntry {
	name: string;
	id: string;
	link?: string;
}

export const MARBLE_CONFIG = {
	// 弹珠大小配置
	size: {
		base: 192,
		min: 96,
		maxScreenRatio: 0.25,
	},

	// 弹珠初始速度配置
	speed: {
		min: 60,
		max: 150,
	},

	// 物理参数
	physics: {
		massScale: 0.01,
		massOffset: 1,
		damping: 0.9985, // 空气阻力/阻尼系数 (0-1)
		restitution: 0.92, // 弹珠碰撞恢复系数 (0-1)
		wallBounce: 0.85, // 墙壁反弹系数 (0-1)
		minSpeed: 50, // 最小速度阈值，低于此值会加速到该值，方式为 CurrentSpeed *= scale = minSpeed / speed
		maxSpeed: 800, // 全局最大速度限制,限制方式如上
	},

	// 动画配置
	animation: {
		fadeInDelay: 100,
		fixedDeltaTime: 1 / 60, // 60 FPS
		maxFrameTime: 0.1, // 100ms
	},

	// 鼠标交互配置
	mouseInteraction: {
		attractRadius: 500, // 吸引范围
		repelRadius: 300, // 排斥范围
		repelForce: 400, // 排斥力
		attractForce: 600, // 吸引力
	},
} as const;

export const AVATAR_BASE_URL = "https://avatar.awfufu.com/qq/";
