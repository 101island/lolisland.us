# 弹珠系统重构指南

## 项目结构

```
src/
├── config/
│   └── marbleConfig.ts          # 配置文件：尺寸、速度、物理参数等
├── data/
│   └── users.ts                 # 数据层：用户数据 API 获取
├── utils/
│   ├── mouseInteraction.ts      # 鼠标交互系统
│   ├── marblePhysics.ts         # 物理引擎
│   ├── marbleFactory.ts         # 弹珠工厂
│   ├── animationLoop.ts         # 动画循环管理器
│   ├── marbleSystem.ts          # 核心系统管理器
│   └── index.ts                 # 统一导出
└── components/
    └── MainView.astro           # 使用封装后的系统
```

## 1. 系统模块化

将原本集中在 `MainView.astro` 中的 ~260 行内联逻辑拆分为多个独立的、可复用的 TypeScript 模块：

### 核心模块

- **`marbleSystem.ts`**: 核心管理器，整合所有子系统，提供统一的 API

  - 管理弹珠集合
  - 协调各子系统工作
  - 提供添加/删除弹珠、启动/停止动画等方法
  - 处理窗口大小变化和缩放功能

- **`marbleFactory.ts`**: 弹珠工厂，负责弹珠的创建、DOM 生成和异步加载

  - 异步加载头像图片
  - 创建弹珠 DOM 节点（wrapper + anchor + label）
  - 生成随机初始位置和速度
  - 支持批量创建（使用 `Promise.allSettled`）
  - 响应式计算弹珠大小
  - 支持缩放级别调整

- **`marblePhysics.ts`**: 物理引擎，处理弹珠的运动、碰撞和边界检测

  - 更新弹珠位置（应用速度、阻尼）
  - 弹珠间的碰撞检测和响应
  - 边界碰撞处理
  - 速度限制（最小/最大速度）
  - DOM 渲染（transform）

- **`mouseInteraction.ts`**: 鼠标交互系统，实现对弹珠的吸引和排斥力场

  - 追踪鼠标位置和 Shift 键状态
  - 判断是否应用力场（距离、移动状态）
  - 应用吸引/排斥力（对数衰减曲线）
  - 悬停在弹珠上时禁用力场（允许点击链接）

- **`animationLoop.ts`**: 独立的动画循环，采用固定时间步长以保证物理模拟的稳定性
  - 固定时间步长（Fixed Timestep）+ 累加器
  - 防止长时间暂停导致的时间跳跃
  - 提供启动/停止/暂停/恢复方法

## 2. 配置与数据分离

### 配置层 (`src/config/marbleConfig.ts`)

集中管理所有弹珠系统配置：

```typescript
export const MARBLE_CONFIG = {
	size: {
		base: 192, // 基础大小
		min: 96, // 最小大小
		maxScreenRatio: 0.25, // 最大屏幕占比
	},
	speed: {
		min: 60, // 最小初始速度
		max: 150, // 最大初始速度
	},
	physics: {
		massScale: 0.01, // 质量计算比例
		massOffset: 1, // 质量偏移
		damping: 0.9985, // 空气阻力系数
		restitution: 0.92, // 碰撞恢复系数
		wallBounce: 0.85, // 墙壁反弹系数
		minSpeed: 50, // 最小速度阈值
		maxSpeed: 800, // 最大速度限制
	},
	animation: {
		fadeInDelay: 100, // 淡入延迟
		fixedDeltaTime: 1 / 60, // 固定时间步长
		maxFrameTime: 0.1, // 最大帧时间
	},
	mouseInteraction: {
		attractRadius: 500, // 吸引范围
		repelRadius: 300, // 排斥范围
		repelForce: 400, // 排斥力度
		attractForce: 600, // 吸引力度
	},
};
```

### 数据层 (`src/data/users.ts`)

将用户数据获取逻辑从组件中分离：

```typescript
export async function fetchUsers(): Promise<UserEntry[]> {
	// 从 API 获取用户数据
	// 包含错误处理
}
```

## 3. 功能保持与优化

### 保持的原有功能

- ✅ 弹珠碰撞检测和响应
- ✅ 边界反弹
- ✅ 从 API 加载用户数据
- ✅ 缩放功能（zoom in/out）
- ✅ 动画循环
- ✅ 响应式弹珠大小

### 优化改进

**鼠标交互**：

- 按住 `Shift` 键切换为吸引模式（默认排斥）
- 力场仅在鼠标移动时激活（300ms 超时）
- 悬停在弹珠上时禁用力场（方便点击链接）
- 力场强度采用对数衰减曲线（更平滑）
- 窗口失焦/页面隐藏时自动重置状态

**物理引擎**：

- 引入阻尼（damping）模拟空气阻力
- 恢复系数（restitution）控制碰撞弹性
- 墙壁反弹系数（wallBounce）独立控制
- 最小速度限制（防止完全静止）
- 最大速度限制（防止速度过快）
- 帧率独立的物理计算

**弹珠创建**：

- 使用 `Promise.allSettled` 批量创建
- 部分头像加载失败不影响其他弹珠
- 添加淡入动画效果
- 支持动态缩放

**动画循环**：

- 固定时间步长（Fixed Timestep）确保物理模拟一致性
- 累加器处理帧率波动
- 最大帧时间限制（防止标签页后台长时间挂起导致的卡顿）

## 4. 代码简化

### 重构前（MainView.astro）

- ~260 行内联脚本代码
- 所有逻辑混在一起
- 难以维护和测试

### 重构后（MainView.astro）

- ~60 行简洁代码
- 只负责初始化和连接
- 清晰的职责划分

```typescript
// 重构后的使用示例
import { MarbleSystem } from "../utils/marbleSystem";
import { fetchUsers } from "../data/users";

const field = document.getElementById("marble-field");
const marbleSystem = new MarbleSystem({
	container: field,
	fieldWidth: window.innerWidth,
	fieldHeight: window.innerHeight,
});

marbleSystem.start();

fetchUsers()
	.then((users) => marbleSystem.addMarbles(users))
	.catch(console.error);
```

## 5. 类型定义

所有模块都有完整的 TypeScript 类型定义：

```typescript
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

export interface UserEntry {
	name: string;
	id: string;
	link?: string;
}

// 更多类型定义...
```

## 6. 统一导出 (`src/utils/index.ts`)

```typescript
export { MarbleSystem } from "./marbleSystem";
export { MarblePhysics } from "./marblePhysics";
export { MouseInteraction } from "./mouseInteraction";
export { MarbleFactory } from "./marbleFactory";
export { AnimationLoop } from "./animationLoop";

export type { Marble } from "./mouseInteraction";
export type { PhysicsConfig } from "./marblePhysics";
export type { MouseInteractionConfig } from "./mouseInteraction";
export type { UpdateCallback } from "./animationLoop";
export type { MarbleSystemConfig } from "./marbleSystem";
```

## 7. 优势总结

✅ **模块化**：清晰的职责分离，每个模块专注一个功能  
✅ **可维护性**：代码结构清晰，易于理解和修改  
✅ **可复用性**：封装后的系统可在其他项目中使用  
✅ **可测试性**：独立的模块便于单元测试  
✅ **类型安全**：完整的 TypeScript 类型定义  
✅ **配置集中**：所有配置参数统一管理  
✅ **功能完整**：保持所有原有功能的同时进行了优化  
✅ **代码精简**：组件代码减少 ~75%
