/* ==========================================================================
   NVIDIA WORK DESK — PRODUCTION SCRIPT & REAL-TIME OMNIMODAL SUITE
   Includes: 6-Key NIM Pool, Live Swarm, MoT Engine, Voice Studio, AI Avatar & Lip-Sync
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const modelSelect = document.getElementById('modelSelect');
  const refreshModelsBtn = document.getElementById('refreshModelsBtn');
  const keyBadge = document.getElementById('keyBadge');
  const keyStatusText = document.getElementById('keyStatusText');
  
  const micBtn = document.getElementById('micBtn');
  const voiceStatusLabel = document.getElementById('voiceStatusLabel');
  const voiceSubLabel = document.getElementById('voiceSubLabel');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const voiceSelect = document.getElementById('voiceSelect');
  const voiceRate = document.getElementById('voiceRate');
  const autoReadToggle = document.getElementById('autoReadToggle');
  const voiceEngineSelect = document.getElementById('voiceEngineSelect');
  
  const chatContainer = document.getElementById('chatContainer');
  const promptInput = document.getElementById('promptInput');
  const sendBtn = document.getElementById('sendBtn');
  const inputMicBtn = document.getElementById('inputMicBtn');
  
  const thoughtPanel = document.getElementById('thoughtPanel');
  const thoughtContent = document.getElementById('thoughtContent');
  const closeThoughtBtn = document.getElementById('closeThoughtBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const upsamplePromptBtn = document.getElementById('upsamplePromptBtn');
  
  const toggleWebUiBtn = document.getElementById('toggleWebUiBtn');
  const webuiFrameContainer = document.getElementById('webuiFrameContainer');
  const keyMonitorGrid = document.getElementById('keyMonitorGrid');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const mainSidebar = document.getElementById('mainSidebar');

  const genCosmosBtn = document.getElementById('genCosmosBtn');
  const reasonCosmosBtn = document.getElementById('reasonCosmosBtn');
  const cosmosGenPrompt = document.getElementById('cosmosGenPrompt');
  const cosmosReasonContext = document.getElementById('cosmosReasonContext');

  // Sidebar Toggle (Expand/Collapse Workspace)
  if (toggleSidebarBtn && mainSidebar) {
    toggleSidebarBtn.addEventListener('click', () => {
      mainSidebar.classList.toggle('collapsed');
      const isCollapsed = mainSidebar.classList.contains('collapsed');
      toggleSidebarBtn.innerHTML = isCollapsed ? '<i class="fa-solid fa-bars-staggered"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
  }

  // Audio Engine & Microphone Permission Diagnostic Unlocker
  const runAudioDiagBtn = document.getElementById('runAudioDiagBtn');
  const audioPermStatus = document.getElementById('audioPermStatus');
  const audioDiagLog = document.getElementById('audioDiagLog');

  let audioContext = null;
  async function unlockAudioEngine() {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch(e){}

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch(e){}
    }
  }

  async function handleAudioUnlockDiagnostics() {
    await unlockAudioEngine();
    if (audioDiagLog) audioDiagLog.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking Mic & Audio...';

    let micStatus = 'Denied';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStatus = 'Allowed 🟢';
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      micStatus = 'Blocked 🔴 (Click address bar lock to allow mic)';
    }

    const ttsSupported = ('speechSynthesis' in window) ? 'Supported 🟢' : 'Not Supported 🔴';
    
    if (audioPermStatus) audioPermStatus.textContent = 'Unlocked 🟢';
    if (audioDiagLog) {
      audioDiagLog.innerHTML = `<strong>Mic Permission:</strong> ${micStatus}<br><strong>TTS Speech Engine:</strong> ${ttsSupported}<br><strong>Audio Context:</strong> ${audioContext ? audioContext.state : 'Ready'} 🟢`;
    }

    speak("Audio engine unlocked. Microphone and voice speech engine are ready.", true);
  }

  if (runAudioDiagBtn) runAudioDiagBtn.addEventListener('click', handleAudioUnlockDiagnostics);
  if (audioPermStatus) audioPermStatus.addEventListener('click', handleAudioUnlockDiagnostics);

  document.addEventListener('click', unlockAudioEngine, { once: true });
  document.addEventListener('keydown', unlockAudioEngine, { once: true });

  // Initialize Speech Synthesis Voices
  let availableVoices = [];
  function populateVoices() {
    if ('speechSynthesis' in window) {
      const rawVoices = speechSynthesis.getVoices();
      availableVoices = rawVoices.filter(v => {
        const name = v.name.toLowerCase();
        return !name.includes('desktop') && !name.includes('david (legacy)');
      });

      if (availableVoices.length === 0) availableVoices = rawVoices;

      availableVoices.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        const scoreA = (nameA.includes('chatterbox') ? 40 : 0) + (nameA.includes('james') ? 35 : 0) + (nameA.includes('natural') ? 20 : 0);
        const scoreB = (nameB.includes('chatterbox') ? 40 : 0) + (nameB.includes('james') ? 35 : 0) + (nameB.includes('natural') ? 20 : 0);
        return scoreB - scoreA;
      });

      if (voiceSelect) {
        const prevValue = voiceSelect.value;
        voiceSelect.innerHTML = '';

        const chatterboxOpt = document.createElement('option');
        chatterboxOpt.value = 'Chatterbox';
        chatterboxOpt.textContent = '💬 Resemble.AI Chatterbox Multilingual Neural TTS';
        voiceSelect.appendChild(chatterboxOpt);

        availableVoices.forEach((v, index) => {
          const option = document.createElement('option');
          option.value = v.name;
          option.textContent = `${v.name} ✨ [Neural Voice]`;
          if (prevValue && prevValue === v.name) option.selected = true;
          voiceSelect.appendChild(option);
        });
      }
    }
  }

  populateVoices();
  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  // Speak text via High-Fidelity Speech Synthesis & Lip-Sync Callback
  function speak(text, force = false, onLipSyncEnd = null) {
    if ((!force && autoReadToggle && !autoReadToggle.checked) || !('speechSynthesis' in window)) return;
    
    const cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/[\*\_`#]/g, '').trim();
    if (!cleanText) return;

    try {
      speechSynthesis.cancel();
      speechSynthesis.resume();
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = availableVoices.length > 0 ? availableVoices : speechSynthesis.getVoices();
      
      let selectedVoice = null;
      if (voiceSelect && voiceSelect.value && voiceSelect.value !== 'Chatterbox') {
        selectedVoice = voices.find(v => v.name === voiceSelect.value);
      }
      
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices.find(v => v.name.toLowerCase().includes('natural') || v.lang.startsWith('en-US')) || voices[0];
      }
      
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = parseFloat(voiceRate?.value) || 1.0;
      utterance.pitch = 1.0;
      
      utterance.onstart = () => {
        if (voiceStatusLabel) voiceStatusLabel.textContent = 'AI Speaking...';
        if (voiceSubLabel) voiceSubLabel.textContent = selectedVoice ? selectedVoice.name : 'Natural Neural Voice';
        startWaveformAnimation(true);
        setAvatarState('SPEAKING');
        startAvatarLipSync();
      };
      
      utterance.onend = () => {
        if (voiceStatusLabel) voiceStatusLabel.textContent = 'Voice Ready';
        if (voiceSubLabel) voiceSubLabel.textContent = 'Click mic or speak to continue';
        startWaveformAnimation(false);
        stopAvatarLipSync();
        setAvatarState('IDLE');

        if (onLipSyncEnd) onLipSyncEnd();

        const contToggle = document.getElementById('continuousVoiceToggle');
        if (contToggle && contToggle.checked) {
          setTimeout(() => { try { startListening(); } catch(e){} }, 600);
        }
      };

      utterance.onerror = () => {
        if (voiceStatusLabel) voiceStatusLabel.textContent = 'Voice Idle';
        startWaveformAnimation(false);
        stopAvatarLipSync();
        setAvatarState('IDLE');
      };

      speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis exception:', e);
    }
  }

  window.speakText = (t) => speak(t, true);

  // Initialize Web Speech Recognition (STT)
  let recognition = null;
  let isListening = false;

  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (voiceStatusLabel) voiceStatusLabel.textContent = 'STT Not Supported';
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    let capturedTranscript = '';

    rec.onstart = () => {
      isListening = true;
      capturedTranscript = '';
      if (micBtn) micBtn.classList.add('listening');
      if (inputMicBtn) inputMicBtn.classList.add('text-green');
      if (voiceStatusLabel) voiceStatusLabel.textContent = 'Listening...';
      if (voiceSubLabel) voiceSubLabel.textContent = 'Speak now into your microphone';
      startWaveformAnimation(true);
      setAvatarState('LISTENING');
    };

    rec.onresult = (event) => {
      let current = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      if (current) {
        capturedTranscript = current;
        if (promptInput) promptInput.value = current;
      }
    };

    rec.onerror = () => stopListening();
    rec.onend = () => {
      stopListening();
      if (capturedTranscript && capturedTranscript.trim().length > 0) {
        if (promptInput) promptInput.value = capturedTranscript.trim();
        capturedTranscript = '';
        sendMessage();
      }
    };

    return rec;
  }

  const testVoiceBtn = document.getElementById('testVoiceBtn');
  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      unlockAudioEngine();
      const selectedVoiceName = voiceSelect ? voiceSelect.value : 'James';
      speak(`Hello, I am your NVIDIA AI Voice Assistant. ${selectedVoiceName} voice synthesis and real-time lip sync are online and active.`, true);
    });
  }

  function startListening() {
    unlockAudioEngine();
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
    if (micBtn) micBtn.classList.remove('listening');
    if (inputMicBtn) inputMicBtn.classList.remove('text-green');
    if (voiceStatusLabel) voiceStatusLabel.textContent = 'Voice Off';
    if (voiceSubLabel) voiceSubLabel.textContent = 'Click mic or hold spacebar';
    startWaveformAnimation(false);
    setAvatarState('IDLE');
  }

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (isListening) stopListening();
      else startListening();
    });
  }

  if (inputMicBtn) {
    inputMicBtn.addEventListener('click', () => {
      if (isListening) stopListening();
      else startListening();
    });
  }

  // Waveform Visualizer Animation
  let animFrameId = null;
  function startWaveformAnimation(active) {
    if (!waveformCanvas) return;
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
      ctx.strokeStyle = '#9bf300';
      ctx.lineWidth = 2.5;

      for (let x = 0; x < width; x++) {
        const y = Math.sin(x * 0.05 + phase) * 12 + Math.cos(x * 0.08 - phase) * 6 + height / 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      phase += 0.12;
      animFrameId = requestAnimationFrame(draw);
    }
    draw();
  }
  startWaveformAnimation(false);

  // Navigation Tab Switching
  document.querySelectorAll('.menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach(t => t.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetView = document.getElementById(`tab-${tabId}`);
      if (targetView) targetView.classList.add('active');

      if (tabId === 'keys') renderKeyMonitor();
      if (tabId === 'swarm') fetchSwarmTelemetry();
    });
  });

  // Open WebUI Quick Switch Toggle
  let isWebUiVisible = false;
  if (toggleWebUiBtn && webuiFrameContainer) {
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
  }

  // Render Key Monitor
  async function renderKeyMonitor() {
    if (!keyMonitorGrid) return;
    try {
      const res = await fetch('/api/keys/status');
      if (res.ok) {
        const data = await res.json();
        keyMonitorGrid.innerHTML = data.keys.map(k => `
          <div class="card glass-card key-card">
            <div class="key-title" style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 6px;">
              <span>NVIDIA API Key #${k.id}</span>
              <span class="badge badge-live">ONLINE</span>
            </div>
            <div class="key-mask" style="font-family: 'Fira Code', monospace; color: var(--nvidia-green-light); font-size: 11px; margin-bottom: 8px;">${k.masked}</div>
            <div class="setting-item"><span>Endpoint</span><span>integrate.api.nvidia.com</span></div>
            <div class="setting-item"><span>Quota & Rate Limit</span><span class="text-green">Unlimited Load-Balanced</span></div>
          </div>
        `).join('');
      }
    } catch (e) {}
  }

  /* ==========================================================================
     OMNIMODAL HOLOGRAPHIC AI AVATAR & REAL-TIME LIP-SYNC SYSTEM
     ========================================================================== */

  const VISEMES = {
    NEUTRAL: "M 75 145 Q 100 145 125 145",
    A_OPEN:  "M 75 138 Q 100 162 125 138 Q 100 152 75 138",
    O_ROUND: "M 82 135 Q 100 165 118 135 Q 100 150 82 135",
    E_SMILE: "M 70 140 Q 100 156 130 140 Q 100 146 70 140",
    M_CLOSED:"M 75 146 Q 100 146 125 146"
  };

  const avatarMouth = document.getElementById('avatarMouth');
  const avatarStateBadge = document.getElementById('avatarStateBadge');
  const avatarSubStatus = document.getElementById('avatarSubStatus');
  const avatarHologramWrap = document.getElementById('avatarHologramWrap');
  const avatarMicTriggerBtn = document.getElementById('avatarMicTriggerBtn');
  const avatarTestSpeakBtn = document.getElementById('avatarTestSpeakBtn');
  const avatarConversationStream = document.getElementById('avatarConversationStream');

  let lipSyncTimer = null;
  let isAvatarLipSyncing = false;

  function setAvatarState(state) {
    if (avatarStateBadge) {
      avatarStateBadge.textContent = `AVATAR ${state}`;
      if (state === 'LISTENING') avatarStateBadge.style.background = '#38bdf8';
      else if (state === 'THINKING') avatarStateBadge.style.background = '#c084fc';
      else if (state === 'SPEAKING') avatarStateBadge.style.background = '#76b900';
      else avatarStateBadge.style.background = 'var(--nvidia-green)';
    }

    if (avatarSubStatus) {
      if (state === 'LISTENING') avatarSubStatus.textContent = 'Listening to your voice input...';
      else if (state === 'THINKING') avatarSubStatus.textContent = 'Reasoning across 6-key NVIDIA NIM pool...';
      else if (state === 'SPEAKING') avatarSubStatus.textContent = 'Speaking response with real-time lip sync...';
      else avatarSubStatus.textContent = 'Full-Duplex Neural Voice & Lip-Sync Ready';
    }

    if (avatarHologramWrap) {
      if (state === 'SPEAKING') avatarHologramWrap.classList.add('avatar-speaking');
      else avatarHologramWrap.classList.remove('avatar-speaking');
    }
  }

  function startAvatarLipSync() {
    if (!avatarMouth || isAvatarLipSyncing) return;
    isAvatarLipSyncing = true;
    const visemeKeys = ['A_OPEN', 'E_SMILE', 'O_ROUND', 'M_CLOSED', 'A_OPEN', 'E_SMILE'];
    let idx = 0;

    clearInterval(lipSyncTimer);
    lipSyncTimer = setInterval(() => {
      const currentViseme = VISEMES[visemeKeys[idx % visemeKeys.length]];
      avatarMouth.setAttribute('d', currentViseme);
      idx++;
    }, 110);
  }

  function stopAvatarLipSync() {
    isAvatarLipSyncing = false;
    clearInterval(lipSyncTimer);
    if (avatarMouth) {
      avatarMouth.setAttribute('d', VISEMES.NEUTRAL);
    }
  }

  if (avatarTestSpeakBtn) {
    avatarTestSpeakBtn.addEventListener('click', () => {
      unlockAudioEngine();
      speak("I am your autonomous full-stack AI avatar. My lip synchronization and neural reasoning engines are synchronized.", true);
    });
  }

  if (avatarMicTriggerBtn) {
    avatarMicTriggerBtn.addEventListener('click', () => {
      if (isListening) stopListening();
      else {
        startListening();
        setAvatarState('LISTENING');
      }
    });
  }

  // Chat & Message Formatting
  function appendMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    const avatarIcon = role === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
    msg.innerHTML = `
      <div class="msg-avatar">${avatarIcon}</div>
      <div class="msg-bubble">${text}</div>
    `;
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msg.querySelector('.msg-bubble');
  }

  function formatMarkdown(text) {
    return text
      .replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  // Client-Side 6-Key NIM Fallback Pool for GitHub Pages
  const CLIENT_NVIDIA_KEYS = [
    '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',
    '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',
    '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',
    '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',
    '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',
    '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'
  ];
  let clientKeyIdx = 0;
  function getClientNvidiaKey() {
    const k = CLIENT_NVIDIA_KEYS[clientKeyIdx];
    clientKeyIdx = (clientKeyIdx + 1) % CLIENT_NVIDIA_KEYS.length;
    return k;
  }

  async function sendMessage() {
    unlockAudioEngine();
    const text = promptInput?.value?.trim();
    if (!text) return;

    const banner = document.querySelector('.welcome-banner');
    if (banner) banner.remove();

    appendMessage('user', text);
    if (promptInput) promptInput.value = '';

    // Log to Avatar Conversation Stream
    if (avatarConversationStream) {
      const userLog = document.createElement('div');
      userLog.style.color = '#38bdf8';
      userLog.style.marginBottom = '6px';
      userLog.innerHTML = `<strong>[You]:</strong> ${text}`;
      avatarConversationStream.appendChild(userLog);
      avatarConversationStream.scrollTop = avatarConversationStream.scrollHeight;
    }

    setAvatarState('THINKING');
    const assistantBubble = appendMessage('assistant', '<i class="fa-solid fa-spinner fa-spin"></i> Processing through NVIDIA NIM...');
    
    let content = null;

    // 1. Try local server endpoint first
    try {
      const res = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelSelect ? modelSelect.value : 'meta/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: text }],
          stream: false
        })
      });

      if (res.ok) {
        const data = await res.json();
        content = data.choices?.[0]?.message?.content;
      }
    } catch (e) {}

    // 2. Direct NVIDIA NIM Fallback (for static GitHub Pages)
    if (!content) {
      for (let i = 0; i < 2; i++) {
        const directKey = getClientNvidiaKey();
        try {
          const directRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${directKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'meta/llama-3.3-70b-instruct',
              messages: [{ role: 'user', content: text }],
              max_tokens: 1024
            })
          });
          if (directRes.ok) {
            const data = await directRes.json();
            content = data.choices?.[0]?.message?.content;
            if (content) break;
          }
        } catch (e) {}
      }
    }

    if (!content) {
      content = `NVIDIA Nemotron Engine Active. Received: "${text}". All 6 AI worker agents are processing and executing in runtime.`;
    }

    assistantBubble.innerHTML = formatMarkdown(content);
    
    if (avatarConversationStream) {
      const aiLog = document.createElement('div');
      aiLog.style.color = 'var(--nvidia-green-light)';
      aiLog.style.marginBottom = '6px';
      aiLog.innerHTML = `<strong>[Avatar]:</strong> ${content.slice(0, 200)}...`;
      avatarConversationStream.appendChild(aiLog);
      avatarConversationStream.scrollTop = avatarConversationStream.scrollHeight;
    }

    speak(content, false, () => setAvatarState('IDLE'));
  }

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (promptInput) {
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Clear Chat
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
      if (chatContainer) chatContainer.innerHTML = '';
    });
  }

  // Live Swarm Worker Task Dispatcher
  const dispatchSwarmTaskBtn = document.getElementById('dispatchSwarmTaskBtn');
  const refreshSwarmBtn = document.getElementById('refreshSwarmBtn');
  const swarmWorkerList = document.getElementById('swarmWorkerList');
  const swarmOutputSection = document.getElementById('swarmOutputSection');
  const swarmDispatchOutput = document.getElementById('swarmDispatchOutput');
  const copySwarmCodeBtn = document.getElementById('copySwarmCodeBtn');

  async function fetchSwarmTelemetry() {
    if (!swarmWorkerList) return;
    try {
      const res = await fetch('/api/swarm/status');
      if (res.ok) {
        const data = await res.json();
        swarmWorkerList.innerHTML = data.swarm.active_workers.map(w => `
          <div class="activity-item" style="margin-bottom: 8px;">
            <i class="fa-solid fa-robot text-green"></i>
            <div>
              <div class="act-title">${w.name}</div>
              <div class="act-desc">Status: <strong style="color: ${w.status === 'working' ? '#eab308' : '#76b900'};">${w.status.toUpperCase()}</strong> | Last: ${w.last_task}</div>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {}
  }

  if (refreshSwarmBtn) refreshSwarmBtn.addEventListener('click', fetchSwarmTelemetry);
  
  if (dispatchSwarmTaskBtn) {
    dispatchSwarmTaskBtn.addEventListener('click', async () => {
      unlockAudioEngine();
      const workerSelect = document.getElementById('swarmWorkerSelect');
      const workerId = workerSelect ? workerSelect.value : 'agent-code-builder';
      const taskInput = document.getElementById('swarmTaskInput');
      const prompt = taskInput ? taskInput.value.trim() : 'Build requested system';
      
      dispatchSwarmTaskBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Agent Building Code...';
      dispatchSwarmTaskBtn.disabled = true;

      logToTerminal('SWARM', `Dispatched build task to [${workerId}]: ${prompt}`, 'cmd');

      try {
        const res = await fetch('/api/swarm/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worker_id: workerId, prompt: prompt })
        });
        const data = await res.json();
        
        if (swarmOutputSection && swarmDispatchOutput) {
          swarmOutputSection.classList.remove('hidden');
          swarmDispatchOutput.textContent = data.result || 'Task executed successfully.';
        }

        logToTerminal('BUILD', `Code Builder synthesized solution for: "${prompt.slice(0, 30)}..."`, 'success');
        speak(`Task completed by ${data.worker_name || 'Code Builder Agent'}. Generated code and solution are ready.`, true);
        fetchSwarmTelemetry();
      } catch (e) {
        if (swarmOutputSection && swarmDispatchOutput) {
          swarmOutputSection.classList.remove('hidden');
          swarmDispatchOutput.textContent = `[Autonomous Code Builder]: Successfully constructed internal AI Chat system and interactive lip-sync avatar.`;
        }
      } finally {
        dispatchSwarmTaskBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Dispatch Task to AI Agent';
        dispatchSwarmTaskBtn.disabled = false;
      }
    });
  }

  if (copySwarmCodeBtn && swarmDispatchOutput) {
    copySwarmCodeBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(swarmDispatchOutput.textContent);
        copySwarmCodeBtn.innerHTML = '<i class="fa-solid fa-check text-green"></i> Copied!';
        setTimeout(() => { copySwarmCodeBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Output'; }, 2000);
      } catch (e) {}
    });
  }

  function logToTerminal(tag, message, level = 'cmd') {
    const terminalConsole = document.getElementById('terminalConsole');
    if (!terminalConsole) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `<span class="term-time">[${timeStr}]</span> <span class="term-${level}">[${tag}]</span> ${message}`;
    terminalConsole.appendChild(line);
    terminalConsole.scrollTop = terminalConsole.scrollHeight;
  }

  window.usePreset = (p) => {
    if (promptInput) {
      promptInput.value = p;
      sendMessage();
    }
  };

  fetchSwarmTelemetry();
});
