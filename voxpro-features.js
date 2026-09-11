(() => {
  const $ = id => document.getElementById(id);

  function combineBuffers(left, middle, right) {
    const ctx = ensureAC();
    const channels = Math.max(left?.numberOfChannels || 0, middle?.numberOfChannels || 0, right?.numberOfChannels || 0, 1);
    const sr = left?.sampleRate || middle?.sampleRate || right?.sampleRate || ctx.sampleRate;
    const leftLen = left?.length || 0, midLen = middle?.length || 0, rightLen = right?.length || 0;
    const out = ctx.createBuffer(channels, leftLen + midLen + rightLen, sr);
    for (let ch = 0; ch < channels; ch++) {
      const o = out.getChannelData(ch);
      let p = 0;
      for (const b of [left, middle, right]) {
        if (!b) continue;
        const srcCh = Math.min(ch, b.numberOfChannels - 1);
        o.set(b.getChannelData(srcCh), p);
        p += b.length;
      }
    }
    return out;
  }

  function sliceBuffer(b, startSec, endSec) {
    if (!b) return null;
    const sr = b.sampleRate;
    const s = Math.max(0, Math.min(b.length, Math.floor(startSec * sr)));
    const e = Math.max(s, Math.min(b.length, Math.floor(endSec * sr)));
    const out = ensureAC().createBuffer(b.numberOfChannels, Math.max(0, e - s), sr);
    for (let ch = 0; ch < b.numberOfChannels; ch++) out.copyToChannel(b.getChannelData(ch).slice(s, e), ch);
    return out;
  }

  // Real paste at the playhead.
  $('paste').onclick = () => {
    if (!buffer || !clipboard) return $('status').textContent = 'Copy or cut audio first.';
    saveHistory();
    const p = Math.max(0, Math.min(duration(), playhead));
    const left = sliceBuffer(buffer, 0, p);
    const right = sliceBuffer(buffer, p, duration());
    buffer = combineBuffers(left, clipboard, right);
    playhead = p + clipboard.duration;
    selA = selB = null;
    $('status').textContent = 'Pasted audio at playhead.';
    draw(); updateReadouts();
  };

  // Marker controls.
  const toolbar = document.querySelector('.toolbar');
  if (toolbar && !$('markBtn')) {
    const mark = document.createElement('button'); mark.id = 'markBtn'; mark.textContent = 'MARK';
    const prev = document.createElement('button'); prev.id = 'prevMarkBtn'; prev.textContent = '◀ MARK';
    const next = document.createElement('button'); next.id = 'nextMarkBtn'; next.textContent = 'MARK ▶';
    toolbar.append(prev, mark, next);
  }
  let markers = [];
  function markerKey() { return 'voxBernie.markers.' + (activeFileId || $('filename')?.textContent || 'untitled'); }
  function loadMarkers() { try { markers = JSON.parse(localStorage.getItem(markerKey()) || '[]'); } catch { markers = []; } }
  function saveMarkers() { localStorage.setItem(markerKey(), JSON.stringify(markers)); }
  $('markBtn')?.addEventListener('click', () => {
    if (!buffer) return;
    loadMarkers();
    const name = prompt('Marker name', 'MARK ' + String(markers.length + 1).padStart(2, '0'));
    if (!name?.trim()) return;
    markers.push({name:name.trim(), time:playhead}); markers.sort((a,b)=>a.time-b.time); saveMarkers();
    $('status').textContent = `Marker ${name.trim()} set at ${fmt(playhead)}.`;
  });
  $('prevMarkBtn')?.addEventListener('click', () => {
    loadMarkers(); if (!markers.length) return;
    const m = [...markers].reverse().find(x => x.time < playhead - .001) || markers[0]; playhead = m.time; draw(); updateReadouts();
    $('status').textContent = `${m.name} · ${fmt(m.time)}`;
  });
  $('nextMarkBtn')?.addEventListener('click', () => {
    loadMarkers(); if (!markers.length) return;
    const m = markers.find(x => x.time > playhead + .001) || markers[markers.length-1]; playhead = m.time; draw(); updateReadouts();
    $('status').textContent = `${m.name} · ${fmt(m.time)}`;
  });

  // Record mode selector: New, Insert, Replace/Punch, Append.
  if (toolbar && !$('recordMode')) {
    const sel = document.createElement('select');
    sel.id = 'recordMode';
    sel.title = 'Record mode';
    sel.innerHTML = '<option value="new">NEW CUT</option><option value="insert">INSERT</option><option value="replace">REPLACE/PUNCH</option><option value="append">APPEND</option>';
    sel.style.minHeight = '30px'; sel.style.background = '#0b0f0c'; sel.style.color = '#fff'; sel.style.border = '1px solid #344038'; sel.style.borderRadius = '8px'; sel.style.padding = '0 8px';
    toolbar.insertBefore(sel, toolbar.firstChild?.nextSibling || null);
  }

  const originalStart = startRecording;
  const originalFinish = finishRecording;
  let recordEditState = null;

  startRecording = async function() {
    const mode = $('recordMode')?.value || 'new';
    if (mode !== 'new' && buffer && activeFileId) {
      recordEditState = {
        mode,
        baseBuffer: buffer,
        baseId: activeFileId,
        baseName: $('filename').textContent,
        playhead,
        selA, selB
      };
    } else recordEditState = null;
    await originalStart();
    if (recordEditState && mediaRecorder?.state === 'recording') {
      $('filename').textContent = recordEditState.baseName;
      $('activeFile').textContent = recordEditState.baseName;
      $('status').textContent = `Recording ${recordEditState.mode.toUpperCase()}…`;
    }
  };

  finishRecording = async function() {
    if (!recordEditState) return originalFinish();
    const state = recordEditState;
    recordEditState = null;
    clearInterval(recordTimer); cancelAnimationFrame(meterRAF); setMeters(0);
    const btn = $('recordTransport'); btn.classList.remove('active'); btn.textContent = '● RECORD';
    if (recordStream) { recordStream.getTracks().forEach(t => t.stop()); recordStream = null; }
    try {
      const blob = new Blob(recordChunks,{type:mediaRecorder.mimeType});
      const arr = await blob.arrayBuffer();
      const rec = await ensureAC().decodeAudioData(arr.slice(0));
      let a = state.playhead, b = state.playhead;
      if (state.mode === 'append') { a = b = state.baseBuffer.duration; }
      if (state.mode === 'replace') {
        if (state.selA != null && state.selB != null && Math.abs(state.selB-state.selA) > .001) {
          a = Math.min(state.selA,state.selB); b = Math.max(state.selA,state.selB);
        } else b = Math.min(state.baseBuffer.duration, a + rec.duration);
      }
      const left = sliceBuffer(state.baseBuffer,0,a);
      const right = sliceBuffer(state.baseBuffer,b,state.baseBuffer.duration);
      buffer = combineBuffers(left, rec, right);
      playhead = a + rec.duration; selA = selB = null; activeFileId = state.baseId;
      const cut = await getCut(activeFileId);
      if (cut) { cut.wav = wavBlob(buffer); cut.duration = buffer.duration; cut.updatedAt = Date.now(); await putCut(cut); }
      $('filename').textContent = state.baseName; $('activeFile').textContent = state.baseName;
      $('status').textContent = `${state.mode.toUpperCase()} recording applied.`;
      pendingFileName = null; draw(); updateReadouts(); renderShelf();
    } catch (e) {
      console.error(e); $('status').textContent = 'RECORD EDIT FAILED: ' + (e.message || e);
    }
  };

  // Faster, progressive audible scrub using Shift + mouse wheel over waveform.
  const timeline = $('wave')?.parentElement;
  timeline?.addEventListener('wheel', e => {
    if (!e.shiftKey || !buffer) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const magnitude = Math.min(2, Math.max(.04, Math.abs(e.deltaY) / 120 * .18));
    audibleJog(e.deltaY < 0 ? -magnitude : magnitude);
  }, {capture:true, passive:false});
})();
