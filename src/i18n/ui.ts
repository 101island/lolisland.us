export const languages = {
  en: "English",
  "zh-cn": "简体中文",
};

export const defaultLang = "en";

export const ui = {
  en: {
    "site.title": "lolisland.us",
    "nav.home": "Home",
    "nav.about": "About",

    // Login
    "login.title": "Login",
    "login.username.placeholder": "Username",
    "login.password.placeholder": "Password",
    "login.submit": "Login",
    "login.or": "OR",
    "login.qq.title": "Login with QQ",
    // Errors (Client-side)
    "error.username_required": "Username required",
    "error.password_required": "Password required",
    "error.network": "Network error",
    "error.login_failed": "Login failed",

    // QQ Auth
    "qq.title": "QQ Login",
    "qq.instruction": "Enter your QQ id to start",
    "qq.input.placeholder": "QQ",
    "qq.next": "Next",
    "qq.back": "Back to Login",
    "qq.error.required": "Enter your QQ",
    "qq.error.format": "QQ number must be 5-11 digits",
    "qq.error.failed_start": "Failed to start auth",

    // Register
    "register.title": "Complete Registration",
    "register.instruction": "Set up your username and password",
    "register.submit": "Register",

    // Dashboard
    "dashboard.logged_in": "Logged In",
    "dashboard.instruction": "Development in progress...",

    // Verification
    "verification.title": "Verification",
    "verification.instruction":
      "Please send the following code to the bot in the QQ group:",
    "verification.waiting": "Waiting for verification...",
    "verification.cancel": "Cancel",
    "verification.copied": "Copied to clipboard!",

    // Settings
    "settings.title": "Title",
    "settings.marbles": "Marbles",
    "settings.collisions": "Collisions",
    "settings.mouse_interaction": "Mouse Interaction",
    "settings.motion": "Motion",
    "settings.orientation": "Orientation",
    "settings.background": "Background",
    "user.logout": "Logout",
  },
  "zh-cn": {
    "site.title": "Lolisland",
    "nav.home": "首页",
    "nav.about": "关于",

    // Login
    "login.title": "登录",
    "login.username.placeholder": "用户名",
    "login.password.placeholder": "密码",
    "login.submit": "登录",
    "login.or": "或",
    "login.qq.title": "QQ 登录",
    // Errors (Client-side)
    "error.username_required": "请输入用户名",
    "error.password_required": "请输入密码",
    "error.network": "网络错误",
    "error.login_failed": "登录失败",

    // QQ Auth
    "qq.title": "QQ 登录",
    "qq.instruction": "请输入 QQ 号以开始",
    "qq.input.placeholder": "QQ 号",
    "qq.next": "下一步",
    "qq.back": "返回登录",
    "qq.error.required": "请输入 QQ 号",
    "qq.error.format": "QQ 号必须是 5-11 位数字",
    "qq.error.failed_start": "启动认证失败",

    // Register
    "register.title": "完成注册",
    "register.instruction": "设置用户名和密码",
    "register.submit": "注册",

    // Dashboard
    "dashboard.logged_in": "已登录",
    "dashboard.instruction": "开发中...",

    // Verification
    "verification.title": "验证",
    "verification.instruction": "请将以下代码发送给机器人所在的 QQ 群：",
    "verification.waiting": "等待验证...",
    "verification.cancel": "取消",
    "verification.copied": "已复制到剪贴板！",

    // Settings
    "settings.title": "标题",
    "settings.marbles": "弹珠",
    "settings.collisions": "碰撞",
    "settings.mouse_interaction": "鼠标交互",
    "settings.motion": "运动感应",
    "settings.orientation": "方向感应",
    "settings.background": "背景",
    "user.logout": "退出登录",
  },
} as const;
