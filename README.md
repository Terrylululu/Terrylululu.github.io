# 大模型问答网页

一个本地运行的问答网页。浏览器只请求本地后端 `/api/chat`，接口密钥保存在 `.env`，不会暴露给前端。

## 运行

```bash
npm install
npm start
```

打开 http://localhost:3000。

## 配置

复制 `.env.example` 为 `.env`，填入你的接口配置：

```bash
ANTHROPIC_BASE_URL=https://token-plan-cn.xiaomimimo.com/anthropic
ANTHROPIC_AUTH_TOKEN=your_token_here
ANTHROPIC_DEFAULT_SONNET_MODEL=mimo-v2.5-pro
PORT=3000
```

当前项目默认调用 Anthropic Messages API：`POST {ANTHROPIC_BASE_URL}/v1/messages`。

## 部署到 Vercel

你不需要购买域名或服务器。Vercel 会自动分配一个 `*.vercel.app` 访问地址。

### 方法一：通过 GitHub 导入

1. 把项目上传到 GitHub 仓库。
2. 打开 https://vercel.com，新建项目并选择这个 GitHub 仓库。
3. Framework Preset 选择 `Other`。
4. Build Command 留空。
5. Output Directory 留空。
6. 在 Environment Variables 添加：

```bash
ANTHROPIC_BASE_URL=https://token-plan-cn.xiaomimimo.com/anthropic
ANTHROPIC_AUTH_TOKEN=your_token_here
ANTHROPIC_DEFAULT_SONNET_MODEL=mimo-v2.5-pro
ANTHROPIC_DEFAULT_OPUS_MODEL=mimo-v2.5-pro
ANTHROPIC_DEFAULT_HAIKU_MODEL=mimo-v2.5-pro
```

7. 点击 Deploy，完成后打开 Vercel 提供的 `*.vercel.app` 地址。

### 方法二：用命令行部署

```bash
npm install
npx vercel
npx vercel env add ANTHROPIC_BASE_URL production
npx vercel env add ANTHROPIC_AUTH_TOKEN production
npx vercel env add ANTHROPIC_DEFAULT_SONNET_MODEL production
npx vercel env add ANTHROPIC_DEFAULT_OPUS_MODEL production
npx vercel env add ANTHROPIC_DEFAULT_HAIKU_MODEL production
npx vercel --prod
```

部署后，Vercel 会使用 `public/` 里的前端页面，并把 `api/config.js` 与 `api/chat.js` 自动作为后端接口运行。

不要把 `.env` 上传到 GitHub。真实密钥只放在 Vercel 的 Environment Variables 里。
