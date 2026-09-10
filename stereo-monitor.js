window.addEventListener('DOMContentLoaded', () => {
  const timeline = document.getElementById('wave')?.parentElement;
  const wave = document.getElementById('wave');
  const recordBtn = document.getElementById('recordTransport');
  const stopBtn = document.getElementById('stop');
  if (!timeline || !wave || !recordBtn || !stopBtn) return;

  timeline.style.position = 'relative';
  const live = document.createElement('canvas');
  live.id = 'stereoLiveWave';
  live.setAttribute('aria-label', 'Live stereo recording waveform');
  Object.assign(live.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    display: 'none', pointerEvents: 'none', zIndex: '4'
  });
  timeline.appendChild(live);

  let monitorStream = null;
  let monitorContext = null;
  let analyserL = null;
  let analyserR = null;
  let raf = 0;
  let historyL = [];
  let historyR = [];

  function selectedInputConstraint() {
    try {
      const s = JSON.parse(localStorage.getItem('bernieWaveEditor.audioSettings') || '{}');
      if (s.inputId && s.inputId !== 'default') return { deviceId: { exact: s.inputId }, channelCount: { ideal: 2 } };
    } catch {}
    return { channelCount: { ideal: 2 } };
  }

  function peak(analyser) {
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let p = 0;
    for (const v of data) p = Math.max(p, Math.abs(v - 128) / 128);
    return p;
  }

  function sizeCanvas() {
    const r = timeline.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    live.width = Math.max(1, Math.floor(r.width * dpr));
    live.height = Math.max(1, Math.floor(r.height * dpr));
  }

  function drawLive() {
    if (!analyserL || !analyserR) return;
    const r = timeline.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height), half = h / 2;
    const dpr = window.devicePixelRatio || 1;
    if (live.width !== Math.floor(w * dpr) || live.height !== Math.floor(h * dpr)) sizeCanvas();
    const g = live.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#080a09'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#263129';
    g.beginPath(); g.moveTo(0, half); g.lineTo(w, half); g.stroke();
    g.fillStyle = '#93a097'; g.font = '11px Segoe UI';
    g.fillText('LEFT', 8, 14); g.fillText('RIGHT', 8, half + 14);

    historyL.push(peak(analyserL)); historyR.push(peak(analyserR));
    const maxPoints = Math.max(20, Math.floor(w / 2));
    if (historyL.length > maxPoints) historyL.splice(0, historyL.length - maxPoints);
    if (historyR.length > maxPoints) historyR.splice(0, historyR.length - maxPoints);

    function trace(values, centerY, laneHeight) {
      g.strokeStyle = '#49df86'; g.lineWidth = 1;
      g.beginPath();
      const xStep = w / Math.max(1, maxPoints - 1);
      values.forEach((v, i) => {
        const x = i * xStep;
        const amp = Math.min(1, v) * laneHeight * .43;
        g.moveTo(x, centerY - amp); g.lineTo(x, centerY + amp);
      });
      g.stroke();
    }
    trace(historyL, half / 2, half);
    trace(historyR, half + half / 2, half);
    raf = requestAnimationFrame(drawLive);
  }

  async function startStereoMonitor() {
    stopStereoMonitor();
    try {
      monitorStream = await navigator.mediaDevices.getUserMedia({
        audio: Object.assign(selectedInputConstraint(), {
          echoCancellation: false, noiseSuppression: false, autoGainControl: false
        })
      });
      monitorContext = new (window.AudioContext || window.webkitAudioContext)();
      if (monitorContext.state === 'suspended') await monitorContext.resume();
      const source = monitorContext.createMediaStreamSource(monitorStream);
      const splitter = monitorContext.createChannelSplitter(2);
      analyserL = monitorContext.createAnalyser(); analyserL.fftSize = 1024;
      analyserR = monitorContext.createAnalyser(); analyserR.fftSize = 1024;
      source.connect(splitter);
      splitter.connect(analyserL, 0);
      try { splitter.connect(analyserR, 1); } catch { splitter.connect(analyserR, 0); }
      historyL = []; historyR = [];
      wave.style.visibility = 'hidden';
      live.style.display = 'block';
      sizeCanvas();
      drawLive();
    } catch (e) {
      console.warn('Stereo waveform monitor unavailable:', e);
      stopStereoMonitor();
    }
  }

  function stopStereoMonitor() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; analyserL = analyserR = null;
    if (monitorStream) monitorStream.getTracks().forEach(t => t.stop());
    monitorStream = null;
    if (monitorContext) monitorContext.close().catch(() => {});
    monitorContext = null;
    live.style.display = 'none';
    wave.style.visibility = 'visible';
  }

  recordBtn.addEventListener('click', () => {
    setTimeout(() => {
      if (recordBtn.classList.contains('active') || /recording/i.test(recordBtn.textContent || '')) startStereoMonitor();
    }, 250);
  });
  stopBtn.addEventListener('click', () => setTimeout(stopStereoMonitor, 40));
  window.addEventListener('beforeunload', stopStereoMonitor);
  window.addEventListener('resize', () => { if (live.style.display !== 'none') sizeCanvas(); });
});
