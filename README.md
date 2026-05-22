# 愤怒的小鸟风格网页游戏

这是一个可以直接在浏览器中游玩的弹弓物理小游戏。页面使用 Canvas 绘制场景、小鸟、目标和建筑结构，物理碰撞由 Matter.js 提供。

## 文件说明

- 页面主体在 `index.html`。
- 游戏视觉样式在 `style.css`。
- 关卡、弹弓、碰撞、计分和 Canvas 绘制逻辑在 `script.js`。
- 过关后自动打开的鼠标气泡特效在 `bubble-demo/`。

## 启动方式

直接在浏览器中打开 `index.html` 即可预览。首次加载需要联网获取 Matter.js CDN 脚本。

每关过关后会自动弹出 `bubble-demo/index.html` 中的鼠标气泡特效页面。