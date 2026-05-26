import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const baseUrl = (process.env.ANTHROPIC_BASE_URL || '').replace(/\/$/, '');
const authToken = process.env.ANTHROPIC_AUTH_TOKEN || '';
const defaultModel =
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
  process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ||
  process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ||
  'mimo-v2.5-pro';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (_request, response) => {
  response.json({
    model: defaultModel,
    baseUrlConfigured: Boolean(baseUrl),
    tokenConfigured: Boolean(authToken)
  });
});

app.post('/api/chat', async (request, response) => {
  if (!baseUrl || !authToken) {
    response.status(500).json({ error: '服务端缺少 ANTHROPIC_BASE_URL 或 ANTHROPIC_AUTH_TOKEN 配置。' });
    return;
  }

  const { messages, system, temperature, maxTokens } = request.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    response.status(400).json({ error: 'messages 不能为空。' });
    return;
  }

  const normalizedMessages = messages
    .filter((message) => message && ['user', 'assistant'].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: String(message.content ?? '').slice(0, 20000)
    }))
    .filter((message) => message.content.trim().length > 0);

  if (normalizedMessages.length === 0 || normalizedMessages.at(-1)?.role !== 'user') {
    response.status(400).json({ error: '最后一条消息必须是用户提问。' });
    return;
  }

  const payload = {
    model: defaultModel,
    max_tokens: Number.isFinite(Number(maxTokens)) ? Math.min(Math.max(Number(maxTokens), 256), 8192) : 2048,
    temperature: Number.isFinite(Number(temperature)) ? Math.min(Math.max(Number(temperature), 0), 1) : 0.6,
    messages: normalizedMessages
  };

  if (typeof system === 'string' && system.trim()) {
    payload.system = system.trim().slice(0, 4000);
  }

  try {
    const upstreamResponse = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': authToken,
        authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    const responseText = await upstreamResponse.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!upstreamResponse.ok) {
      response.status(upstreamResponse.status).json({
        error: data?.error?.message || data?.message || data?.raw || '大模型接口请求失败。'
      });
      return;
    }

    const answer = Array.isArray(data.content)
      ? data.content.map((part) => (part.type === 'text' ? part.text : '')).join('\n').trim()
      : '';

    response.json({
      answer: answer || '模型没有返回文本内容。',
      usage: data.usage ?? null,
      model: data.model ?? defaultModel
    });
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : '无法连接到大模型接口。' });
  }
});

app.listen(port, () => {
  console.log(`LLM QA web app is running at http://localhost:${port}`);
});
