# Terrylululu.github.io

这是 Terry 的 GitHub Pages 个人主页模板。

## 发布方式

1. 在 GitHub 创建一个公开仓库，名字必须是：

```text
Terrylululu.github.io
```

2. 把本文件夹里的内容推送到这个仓库根目录：

```bash
git init
git add .
git commit -m "Create personal homepage"
git branch -M main
git remote add origin https://github.com/Terrylululu/Terrylululu.github.io.git
git push -u origin main
```

3. 打开仓库 Settings -> Pages。

4. Source 选择 `Deploy from a branch`，Branch 选择 `main` 和 `/root`。

5. 等待 GitHub Pages 构建完成后访问：

```text
https://Terrylululu.github.io/
```

## 修改内容

- 页面主体在 `index.html`。
- 样式在 `style.css`。
- 项目链接和个人介绍都可以直接改 HTML 文本。
