const messagesElement = document.querySelector('#messages');
const chatForm = document.querySelector('#chatForm');
const promptInput = document.querySelector('#promptInput');
const sendButton = document.querySelector('#sendButton');
const newChatButton = document.querySelector('#newChat');
const statusPill = document.querySelector('#statusPill');
const modelName = document.querySelector('#modelName');
const systemPrompt = document.querySelector('#systemPrompt');
const temperature = document.querySelector('#temperature');
const temperatureValue = document.querySelector('#temperatureValue');
const maxTokens = document.querySelector('#maxTokens');
const usageInfo = document.querySelector('#usageInfo');

let conversation = [];

function renderMessages() {
  messagesElement.innerHTML = '';

  if (conversation.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '等待你的第一个问题';
    messagesElement.append(empty);
    return;
  }

  for (const message of conversation) {
    const item = document.createElement('article');
    item.className = `message ${message.role}`;

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.textContent = message.role === 'user' ? '你' : message.role === 'assistant' ? '模型' : '错误';

    const content = document.createElement('div');
    content.textContent = message.content;

    item.append(meta, content);
    messagesElement.append(item);
  }

  messagesElement.scrollTop = messagesElement.scrollHeight;
}

function setStatus(text, state) {
  statusPill.textContent = text;
  statusPill.className = `status-pill ${state || ''}`.trim();
}

function setLoading(isLoading) {
  sendButton.disabled = isLoading;
  promptInput.disabled = isLoading;
  sendButton.textContent = isLoading ? '生成中' : '发送';
}

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    modelName.textContent = config.model || 'mimo-v2.5-pro';
    setStatus(config.baseUrlConfigured && config.tokenConfigured ? '配置正常' : '缺少配置', config.baseUrlConfigured && config.tokenConfigured ? 'ok' : 'error');
  } catch {
    setStatus('服务未连接', 'error');
  }
}

async function askModel(question) {
  const userMessage = { role: 'user', content: question };
  conversation.push(userMessage);
  renderMessages();
  setLoading(true);
  usageInfo.textContent = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: conversation,
        system: systemPrompt.value,
        temperature: Number(temperature.value),
        maxTokens: Number(maxTokens.value)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    conversation.push({ role: 'assistant', content: data.answer });

    if (data.usage) {
      const input = data.usage.input_tokens ?? 0;
      const output = data.usage.output_tokens ?? 0;
      usageInfo.textContent = `输入 ${input} / 输出 ${output}`;
    }
  } catch (error) {
    conversation.push({
      role: 'error',
      content: error instanceof Error ? error.message : '请求失败'
    });
  } finally {
    renderMessages();
    setLoading(false);
    promptInput.focus();
  }
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = promptInput.value.trim();

  if (!question) {
    return;
  }

  promptInput.value = '';
  askModel(question);
});

newChatButton.addEventListener('click', () => {
  conversation = [];
  usageInfo.textContent = '';
  renderMessages();
  promptInput.focus();
});

temperature.addEventListener('input', () => {
  temperatureValue.textContent = temperature.value;
});

loadConfig();
renderMessages();
