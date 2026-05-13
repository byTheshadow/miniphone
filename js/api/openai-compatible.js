/* ========== [BLOCK: MiniPhone AI API 模块] ========== */
/**
 * MiniPhone.AI
 * OpenAI 兼容接口封装
 * 支持 OpenAI / Claude / 本地模型等所有兼容 /v1/chat/completions 的 API
 */
var MiniPhone = window.MiniPhone || {};

MiniPhone.AI = (function() {
  'use strict';

  /* ========== [BLOCK: 默认配置] ========== */
  var config = {
    endpoint: '',// API 端点，如 https://api.openai.com
    apiKey: '',          // API Key
    model: 'gpt-4o-mini', // 默认模型
    maxTokens: 2048,     // 最大输出 token
    temperature: 0.7,// 温度
    topP: 1,
    stream: true// 是否使用流式输出
  };
  /* ========== [/BLOCK: 默认配置] ========== */

  /* ========== [BLOCK: 配置管理] ========== */
  function setConfig(newConfig) {
    Object.keys(newConfig).forEach(function(key) {
      if (config.hasOwnProperty(key)) {
        config[key] = newConfig[key];
      }
    });
    // 持久化
    MiniPhone.Storage.local.set('ai_config', {
      endpoint: config.endpoint,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      topP: config.topP,
      stream: config.stream
    });
  }

  function getConfig() {
    return Object.assign({}, config);
  }

  function loadConfig() {
    var saved = MiniPhone.Storage.local.get('ai_config', {});
    Object.keys(saved).forEach(function(key) {
      if (config.hasOwnProperty(key) && saved[key] !== undefined) {
        config[key] = saved[key];
      }
    });
    // API Key 单独加载（加密存储）
    var key = MiniPhone.KeyManager ? MiniPhone.KeyManager.getKey() : null;
    if (key) config.apiKey = key;

    var endpoint = MiniPhone.KeyManager ? MiniPhone.KeyManager.getEndpoint() : null;
    if (endpoint) config.endpoint = endpoint;
  }

  function isConfigured() {
    return !!(config.endpoint && config.apiKey);
  }
  /* ========== [/BLOCK: 配置管理] ========== */

  /* ========== [BLOCK: 构建请求 URL] ========== */
  function buildUrl() {
    var base = config.endpoint.replace(/\/+$/, '');
    return base + '/v1/chat/completions';
  }
  /* ========== [/BLOCK: 构建请求 URL] ========== */

  /* ========== [BLOCK: 非流式请求] ========== */
  function chatCompletion(messages, options) {
    options = options || {};

    if (!isConfigured()) {
      return Promise.reject(new Error('API 未配置，请先在设置中配置 API'));
    }

    var body = {
      model: options.model || config.model,
      messages: messages,
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature !== undefined ? options.temperature : config.temperature,
      top_p: options.topP !== undefined ? options.topP : config.topP,
      stream: false
    };

    return fetch(buildUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey
      },
      body: JSON.stringify(body)
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().then(function(err) {
          throw new Error((err.error && err.error.message) || 'API 请求失败: ' + response.status);
        });
      }
      return response.json();
    })
    .then(function(data) {
      return {
        content: data.choices[0].message.content,
        usage: data.usage || null,
        model: data.model,
        raw: data
      };
    });
  }
  /* ========== [/BLOCK: 非流式请求] ========== */

  /* ========== [BLOCK: 流式请求（SSE）] ========== */
  /**
   * @param {Array} messages - 消息数组
   * @param {Function} onChunk - 每个 chunk 的回调 (text, done)
   * @param {Object} options - 可选配置
   * @returns {Object} - { abort() } 可取消请求
   */
  function chatStream(messages, onChunk, options) {
    options = options || {};
    var aborted = false;
    var controller = new AbortController();

    if (!isConfigured()) {
      onChunk('', true, new Error('API 未配置'));
      return { abort: function() {} };
    }

    var body = {
      model: options.model || config.model,
      messages: messages,
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature !== undefined ? options.temperature : config.temperature,
      top_p: options.topP !== undefined ? options.topP : config.topP,
      stream: true
    };

    fetch(buildUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.apiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().then(function(err) {
          throw new Error((err.error && err.error.message) || 'API 请求失败: ' + response.status);
        });
      }

      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';

      function read() {
        return reader.read().then(function(result) {
          if (result.done || aborted) {
            onChunk('', true);
            return;
          }

          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || !line.startsWith('data:')) continue;
            var data = line.slice(5).trim();
            if (data === '[DONE]') {
              onChunk('', true);
              return;
            }
            try {
              var parsed = JSON.parse(data);
              var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
              if (delta && delta.content) {
                onChunk(delta.content, false);
              }
            } catch (e) {
              //忽略解析错误
            }
          }

          return read();
        });
      }

      return read();
    })
    .catch(function(err) {
      if (!aborted) {
        onChunk('', true, err);
      }
    });

    return {
      abort: function() {
        aborted = true;
        controller.abort();
      }
    };
  }
  /* ========== [/BLOCK: 流式请求（SSE）] ========== */

  /* ========== [BLOCK: 便捷方法] ========== */
  /**
   * 简单的单轮对话
   */
  function ask(prompt, systemPrompt, options) {
    var messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    return chatCompletion(messages, options);
  }
  /* ========== [/BLOCK: 便捷方法] ========== */

  /* ========== [BLOCK: 公开 API] ========== */
  return {
    setConfig: setConfig,
    getConfig: getConfig,
    loadConfig: loadConfig,
    isConfigured: isConfigured,
    chat: chatCompletion,
    stream: chatStream,
    ask: ask
  };
  /* ========== [/BLOCK: 公开 API] ========== */

})();
/* ========== [/BLOCK: MiniPhone AI API 模块] ========== */
