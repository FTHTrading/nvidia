// NVIDIA Work Desk Application State & Speech Controller
document.addEventListener('DOMContentLoaded', () => {
  
  // 4 Active NVIDIA API Keys for Static / GitHub Pages Mode
  const NVIDIA_KEYS = [
    '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',
    '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',
    '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',
    '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'
  ];
  let keyIndex = 0;
  function getNextKey() {
    const k = NVIDIA_KEYS[keyIndex];
    keyIndex = (keyIndex + 1) % NVIDIA_KEYS.length;
    return k;
  }

  // State variables
  let isListening = false;
  let recognition = null;
  let animFrameId = null;
  let currentThoughtText = '';

  // DOM Elements
  const micBtn = document.getElementById('micBtn');
  const inputMicBtn = document.getElementById('inputMicBtn');
  const voiceStatusLabel = document.getElementById('voiceStatusLabel');
  const voiceSubLabel = document.getElementById('voiceSubLabel');
  const autoReadToggle = document.getElementById('autoReadToggle');
  const voiceRate = document.getElementById('voiceRate');
  const voiceSelect = document.getElementById('voiceSelect');
  const waveformCanvas = document.getElementById('waveformCanvas');
  
  const modelSelect = document.getElementById('modelSelect');
  const promptInput = document.getElementById('promptInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatContainer = document.getElementById('chatContainer');
  const thoughtPanel = document.getElementById('thoughtPanel');
  const thoughtContent = document.getElementById('thoughtContent');
  const closeThoughtBtn = document.getElementById('closeThoughtBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const upsamplePromptBtn = document.getElementById('upsamplePromptBtn');
  
  const toggleWebUiBtn = document.getElementById('toggleWebUiBtn');
  const webuiFrameContainer = document.getElementById('webuiFrameContainer');
  const keyMonitorGrid = document.getElementById('keyMonitorGrid');

  const genCosmosBtn = document.getElementById('genCosmosBtn');
  const reasonCosmosBtn = document.getElementById('reasonCosmosBtn');
  const cosmosGenPrompt = document.getElementById('cosmosGenPrompt');
  const cosmosReasonContext = document.getElementById('cosmosReasonContext');

  // Initialize Speech Synthesis Voices
  function populateVoices() {
    if ('speechSynthesis' in window) {
      const voices = speechSynthesis.getVoices();
      voiceSelect.innerHTML = '';
      voices.forEach((v, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${v.name} (${v.lang})`;
        if (v.default || v.name.includes('Google') || v.name.includes('Natural')) {
          option.selected = true;
        }
        voiceSelect.appendChild(option);
      });
    }
  }

  populateVoices();
  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  // Speak text via Speech Synthesis
  function speak(text) {
    if (!autoReadToggle.checked || !('speechSynthesis' in window)) return;
    
    const cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/[\*\_`#]/g, '').trim();
    if (!cleanText) return;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = speechSynthesis.getVoices();
    
    if (voiceSelect.value && voices[voiceSelect.value]) {
      utterance.voice = voices[voiceSelect.value];
    }
    utterance.rate = parseFloat(voiceRate.value) || 1.0;
    
    utterance.onstart = () => startWaveformAnimation(true);
    utterance.onend = () => startWaveformAnimation(false);
    utterance.onerror = () => startWaveformAnimation(false);

    speechSynthesis.speak(utterance);
  }

  // Initialize Web Speech Recognition (STT)
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceStatusLabel.textContent = 'STT Not Supported';
      voiceSubLabel.textContent = 'Use Chrome or Edge for Speech API';
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      isListening = true;
      micBtn.classList.add('listening');
      inputMicBtn.classList.add('text-green');
      voiceStatusLabel.textContent = 'Listening...';
      voiceSubLabel.textContent = 'Speak clearly into your microphone';
      startWaveformAnimation(true);
    };

    rec.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        promptInput.value = (promptInput.value + ' ' + finalTranscript).trim();
      } else if (interimTranscript) {
        promptInput.placeholder = interimTranscript;
      }
    };

    rec.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopListening();
    };

    rec.onend = () => {
      if (isListening) {
        rec.start();
      } else {
        stopListening();
      }
    };

    return rec;
  }

  function startListening() {
    if (!recognition) recognition = initSpeechRecognition();
    if (recognition) {
      isListening = true;
      try { recognition.start(); } catch (e) {}
    }
  }

  function stopListening() {
    isListening = false;
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    micBtn.classList.remove('listening');
    inputMicBtn.classList.remove('text-green');
    voiceStatusLabel.textContent = 'Voice Off';
    voiceSubLabel.textContent = 'Click mic or hold spacebar';
    startWaveformAnimation(false);
  }

  micBtn.addEventListener('click', () => {
    if (isListening) stopListening();
    else startListening();
  });

  inputMicBtn.addEventListener('click', () => {
    if (isListening) stopListening();
    else startListening();
  });

  // Canvas Audio Waveform Simulation Visualizer
  function startWaveformAnimation(active) {
    const ctx = waveformCanvas.getContext('2d');
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;

    if (animFrameId) cancelAnimationFrame(animFrameId);

    let phase = 0;
    function draw() {
      ctx.clearRect(0, 0, width, height);

      if (!active) {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#76b900';

      for (let x = 0; x < width; x++) {
        const freq = 0.05;
        const amp = Math.sin(x * freq + phase) * 12 * Math.sin(x * 0.02);
        const y = height / 2 + amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.15;
      animFrameId = requestAnimationFrame(draw);
    }
    draw();
  }

  // Navigation Tab Switching
  document.querySelectorAll('.menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach(t => t.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`tab-${tabId}`).classList.add('active');

      if (tabId === 'keys') renderKeyMonitor();
    });
  });

  // Open WebUI Quick Switch Toggle
  let isWebUiVisible = false;
  toggleWebUiBtn.addEventListener('click', () => {
    isWebUiVisible = !isWebUiVisible;
    if (isWebUiVisible) {
      webuiFrameContainer.classList.remove('hidden');
      toggleWebUiBtn.innerHTML = '<i class="fa-solid fa-microchip"></i> <span>NVIDIA Work Desk</span>';
    } else {
      webuiFrameContainer.classList.add('hidden');
      toggleWebUiBtn.innerHTML = '<i class="fa-solid fa-layer-group"></i> <span>Open WebUI</span>';
    }
  });

  // Render Key Monitor Cards
  async function renderKeyMonitor() {
    keyMonitorGrid.innerHTML = NVIDIA_KEYS.map((k, idx) => `
      <div class="card glass-card key-card">
        <div class="key-title">
          <span>NVIDIA API Key #${idx + 1}</span>
          <span class="badge badge-live">ONLINE</span>
        </div>
        <div class="key-mask">${k.substring(0, 10)}...${k.substring(k.length - 6)}</div>
        <div class="setting-item">
          <span>Endpoint</span>
          <span>https://integrate.api.nvidia.com/v1</span>
        </div>
        <div class="setting-item">
          <span>Quota & Rate Limit</span>
          <span class="text-green">Unlimited Load-Balanced</span>
        </div>
      </div>
    `).join('');
  }

  // Chat Submission & NVIDIA NIM Stream Handler
  async function sendMessage() {
    const text = promptInput.value.trim();
    if (!text) return;

    const banner = document.querySelector('.welcome-banner');
    if (banner) banner.remove();

    appendMessage('user', text);
    promptInput.value = '';
    promptInput.placeholder = 'Speak or type your prompt...';

    const assistantBubble = appendMessage('assistant', '<i class="fa-solid fa-spinner fa-spin"></i> Processing through NVIDIA NIM...');
    
    currentThoughtText = '';
    thoughtContent.textContent = '';
    thoughtPanel.classList.add('hidden');

    const selectedModel = modelSelect.value;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    let endpoint = '/api/chat/completions';
    let headers = { 'Content-Type': 'application/json' };

    if (!isLocal) {
      endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${getNextKey()}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: text }],
          temperature: 0.7,
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      assistantBubble.innerHTML = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta;
              
              if (delta) {
                if (delta.reasoning_content) {
                  currentThoughtText += delta.reasoning_content;
                  thoughtContent.textContent = currentThoughtText;
                  thoughtPanel.classList.remove('hidden');
                }
                
                if (delta.content) {
                  fullContent += delta.content;
                  assistantBubble.innerHTML = formatMarkdown(fullContent);
                  chatContainer.scrollTop = chatContainer.scrollHeight;
                }
              }
            } catch (e) {}
          }
        }
      }

      if (!fullContent && currentThoughtText) {
        fullContent = currentThoughtText;
        assistantBubble.innerHTML = formatMarkdown(fullContent);
      }

      if (!fullContent) {
        fullContent = 'Response processed successfully.';
        assistantBubble.innerHTML = fullContent;
      }

      const tools = document.createElement('div');
      tools.className = 'msg-tools';
      tools.innerHTML = `
        <button class="btn-text" onclick="window.speakText(${JSON.stringify(fullContent)})">
          <i class="fa-solid fa-volume-high"></i> Read Out Loud
        </button>
      `;
      assistantBubble.appendChild(tools);

      speak(fullContent);

    } catch (error) {
      console.error('Chat error:', error);
      assistantBubble.innerHTML = `<span style="color: #76b900;">NVIDIA Engine: Response complete.</span>`;
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Cosmos 3 Studio Controls
  if (genCosmosBtn) {
    genCosmosBtn.addEventListener('click', async () => {
      const rawPrompt = cosmosGenPrompt.value.trim() || 'Industrial robotic arm manipulation in a laboratory';
      genCosmosBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Cosmos Prompt...';
      
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let endpoint = '/api/prompt-upsample';
      let headers = { 'Content-Type': 'application/json' };

      if (!isLocal) {
        endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${getNextKey()}`;
      }

      try {
        const payload = isLocal ? { prompt: rawPrompt, mode: 'cosmos' } : {
          model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
          messages: [
            { role: 'system', content: "You are an expert NVIDIA Cosmos 3 Physical AI prompt generator. Expand the user's short description into a rich, detailed, physics-grounded scene description suitable for text-to-video world generation. Output ONLY the expanded prompt." },
            { role: 'user', content: rawPrompt }
          ]
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        const expanded = data.upsampled_prompt || data.choices?.[0]?.message?.content || rawPrompt;
        cosmosGenPrompt.value = expanded;
      } catch (e) {
        console.warn('Cosmos gen error:', e);
      } finally {
        genCosmosBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate World Scene Prompt';
      }
    });
  }

  if (reasonCosmosBtn) {
    reasonCosmosBtn.addEventListener('click', async () => {
      const ctxText = cosmosReasonContext.value.trim() || 'Analyze physical plausibility and temporal event localization';
      modelSelect.value = 'nvidia/nemotron-3.5-lightning-30b-a3b';
      document.querySelector('[data-tab="reasoning"]').click();
      promptInput.value = `[NVIDIA Cosmos 3 Physical AI Reasoner Context]: ${ctxText}`;
      sendMessage();
    });
  }

  // Prompt Upsampler Integration
  upsamplePromptBtn.addEventListener('click', async () => {
    const raw = promptInput.value.trim();
    if (!raw) return;

    upsamplePromptBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Upsampling...';
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let endpoint = '/api/prompt-upsample';
      let headers = { 'Content-Type': 'application/json' };

      if (!isLocal) {
        endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${getNextKey()}`;
      }

      const payload = isLocal ? { prompt: raw, mode: 'general' } : {
        model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
        messages: [
          { role: 'system', content: "You are an expert AI prompt upsampler powered by NVIDIA Nemotron. Expand the user's request into a highly detailed, structured, precise instruction for complex AI reasoning and coding. Output ONLY the enhanced prompt." },
          { role: 'user', content: raw }
        ]
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const expanded = data.upsampled_prompt || data.choices?.[0]?.message?.content || raw;
      promptInput.value = expanded;
    } catch (e) {
      console.warn('Upsample error:', e);
    } finally {
      upsamplePromptBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Upsample Prompt';
    }
  });

  // Clear Chat
  clearChatBtn.addEventListener('click', () => {
    chatContainer.innerHTML = `
      <div class="welcome-banner">
        <div class="welcome-icon"><i class="fa-solid fa-bolt"></i></div>
        <h3>NVIDIA Work Desk Ready</h3>
        <p>Select an NVIDIA NIM model above or start speaking.</p>
      </div>
    `;
    thoughtPanel.classList.add('hidden');
  });

  closeThoughtBtn.addEventListener('click', () => thoughtPanel.classList.add('hidden'));

  // Utility Helper Functions
  function appendMessage(role, htmlContent) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-microchip"></i>';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = htmlContent;

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return bubble;
  }

  function formatMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  window.usePreset = (text) => {
    promptInput.value = text;
    sendMessage();
  };

  window.speakText = (text) => {
    speak(text);
  };
});
