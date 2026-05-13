/* ==========================================
   MiniPhone AI — claude.js
   Anthropic Claude API 調用封裝
   支援串流 (streaming) 回應
   ========================================== */

const ClaudeAPI = (() => {
  const API_URL = 'https://api.anthropic.com/v1/messages';
  const API_VERSION = '2023-06-01';

  /* ── 核心呼叫（非串流） ── */
  async function call({ model, system, messages, maxTokens = 1024 }) {
    const apiKey = KeyManager.getKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const body = {
      model,
      max_tokens: maxTokens,
      messages,
    };
    if (system) body.system = system;

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    const data = await res.json();
    return data.content[0]?.text || '';
  }

  /* ── 串流呼叫 ── */
  async function callStream({ model, system, messages, maxTokens = 2048, onChunk, onDone, onError }) {
    const apiKey = KeyManager.getKey();
    if (!apiKey) {
      onError && onError(new Error('NO_API_KEY'));
      return;
    }

    const body = {
      model,
      max_tokens: maxTokens,
      stream: true,
      messages,
    };
    if (system) body.system = system;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta') {
              const chunk = parsed.delta?.text || '';
              fullText += chunk;
              onChunk && onChunk(chunk, fullText);
            }
          } catch {
            // 忽略解析錯誤
          }
        }
      }

      onDone && onDone(fullText);
    } catch (err) {
      onError && onError(err);
    }
  }

  /* ── 建構聊天訊息格式 ── */
  function buildMessages(history, userText) {
    const messages = [];

    // 歷史訊息（過濾系統訊息）
    for (const msg of history) {
      if (msg.role === 'system') continue;
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // 新用戶訊息
    if (userText) {
      messages.push({ role: 'user', content: userText });
    }

    return messages;
  }

  /* ── 建構系統提示詞（角色扮演） ── */
  function buildSystemPrompt(char, userProfile, memory) {
    const userName = userProfile?.name || '用戶';
    const userPersona = userProfile?.persona || '';

    let system = `你是 ${char.name}。\n\n`;

    if (char.persona) {
      system += `## 角色設定\n${char.persona}\n\n`;
    }

    if (char.worldBook) {
      system += `## 世界背景\n${char.worldBook}\n\n`;
    }

    if (memory) {
      system += `## 對話記憶摘要\n${memory}\n\n`;
    }

    system += `## 對話對象\n`;
    system += `你正在和 ${userName} 對話。`;
    if (userPersona) system += `\n關於 ${userName}：${userPersona}`;

    system += `\n\n## 行為準則\n`;
    system += `- 完全沉浸在角色中，以第一人稱回應\n`;
    system += `- 保持角色性格一致\n`;
    system += `- 回應要自然、有情感、符合角色\n`;
    system += `- 除非角色設定需要，否則不要超出字數`;

    return system;
  }

  /* ── 模型本體系統提示詞（無角色） ── */
  const NATIVE_SYSTEM = `你是 Claude，Anthropic 製作的 AI 助理，在 MiniPhone AI 中以「模型本體」身份運行。
你可以自由地表達自己的想法、協助各種任務，包括學術研究、創意寫作、分析等。
請以友善、直接的方式回應，不需要扮演任何角色。`;

  return {
    call,
    callStream,
    buildMessages,
    buildSystemPrompt,
    NATIVE_SYSTEM,
  };
})();
