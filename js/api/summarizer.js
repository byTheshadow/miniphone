/* ==========================================
   MiniPhone AI — summarizer.js
   30 條訊息自動摘要，注入記憶庫
   ========================================== */

const Summarizer = (() => {
  const TRIGGER_COUNT = 30;
  const MODEL = 'claude-sonnet-4-5';

  const SUMMARY_PROMPT = `請將以下對話記錄整理成簡潔的記憶摘要（繁體中文，200字以內）。
重點保留：雙方的重要互動、情感變化、關鍵事件、已確認的資訊。
請直接輸出摘要，不要加任何標題或前綴。`;

  async function checkAndSummarize(characterId) {
    const count = await Storage.getMessageCountByCharacter(characterId);
    if (count < TRIGGER_COUNT) return false;
    if (count % TRIGGER_COUNT !== 0) return false;

    await summarize(characterId);
    return true;
  }

  async function summarize(characterId) {
    try {
      const messages = await Storage.getMessagesByCharacter(characterId, TRIGGER_COUNT);
      if (!messages.length) return;

      const dialogText = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'user' ? '用戶' : '角色'}：${m.content}`)
        .join('\n');

      const existingMemory = await Storage.getMemory(characterId);
      let prompt = '';
      if (existingMemory) {
        prompt = `舊記憶摘要：\n${existingMemory}\n\n新對話：\n${dialogText}`;
      } else {
        prompt = dialogText;
      }

      const summary = await ClaudeAPI.call({
        model: MODEL,
        system: SUMMARY_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
      });

      await Storage.saveMemory(characterId, summary);
      console.log('[Summarizer] 記憶已更新:', characterId);
    } catch (err) {
      console.warn('[Summarizer] 摘要失敗:', err.message);
    }
  }

  return { checkAndSummarize, summarize, TRIGGER_COUNT };
})();
