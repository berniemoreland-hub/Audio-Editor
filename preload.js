const { contextBridge, ipcRenderer } = require('electron');

const versionArg = process.argv.find(arg => arg.startsWith('--bernie-app-version='));
const version = versionArg ? versionArg.split('=')[1] : '0.0.0';
const parts = version.split('.');
const buildNumber = String(parseInt(parts[2] || '0', 10)).padStart(3, '0');
const majorMinor = `${parts[0] || '0'}.${parts[1] || '0'}`;

contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop: true,
  platform: process.platform,
  version,
  buildNumber,
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateStatus: callback => ipcRenderer.on('update-status', (_event, data) => callback(data))
});

window.addEventListener('DOMContentLoaded', () => {
  const buildBadge = document.querySelector('.build');
  if (buildBadge) buildBadge.textContent = `VERSION ${majorMinor} · Build ${buildNumber}`;
  const footer = document.querySelector('.footer');
  if (footer) footer.textContent = `Bernie Wave Editor · Version ${majorMinor} · Build ${buildNumber} · Single-track VoxPro-style workflow`;
  document.title = `Bernie Wave Editor — Build ${buildNumber}`;

  if (buildBadge && !document.getElementById('updateAppBtn')) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';
    buildBadge.parentNode.insertBefore(wrap, buildBadge);
    wrap.appendChild(buildBadge);

    const updateButton = document.createElement('button');
    updateButton.id = 'updateAppBtn';
    updateButton.type = 'button';
    updateButton.textContent = 'UPDATE';
    updateButton.title = 'Check for a newer Bernie Wave Editor version';
    updateButton.style.minHeight = '34px';
    updateButton.style.padding = '0 12px';
    updateButton.style.borderRadius = '999px';
    updateButton.style.fontSize = '11px';
    updateButton.style.fontWeight = '900';
    updateButton.style.letterSpacing = '.06em';
    wrap.appendChild(updateButton);

    const setButton = (text, disabled = false) => {
      updateButton.textContent = text;
      updateButton.disabled = disabled;
    };

    updateButton.addEventListener('click', async () => {
      setButton('CHECKING…', true);
      try {
        const result = await ipcRenderer.invoke('check-for-updates');
        if (!result?.ok) return setButton('UPDATE');
        if (result.state === 'current') {
          setButton('UP TO DATE');
          window.setTimeout(() => setButton('UPDATE'), 2200);
        } else setButton('DOWNLOADING…', true);
      } catch {
        setButton('UPDATE');
      }
    });

    ipcRenderer.on('update-status', (_event, data) => {
      if (!data) return;
      if (data.state === 'downloading') setButton(`GETTING ${data.version}…`, true);
      else if (data.state === 'progress') setButton(`UPDATE ${data.percent}%`, true);
      else if (data.state === 'ready') setButton('RESTART TO UPDATE');
      else if (data.state === 'current') {
        setButton('UP TO DATE');
        window.setTimeout(() => setButton('UPDATE'), 2200);
      } else if (data.state === 'error') {
        setButton('UPDATE FAILED');
        window.setTimeout(() => setButton('UPDATE'), 2500);
      }
    });
  }

  const repair = document.createElement('script');
  repair.textContent = `
  (() => {
    const byId=id=>document.getElementById(id);
    const status=byId('status');
    const recBtn=byId('rec');
    const settingsBtn=byId('settingsBtn');
    const settingsPage=byId('settingsPage');
    const settingsClose=byId('settingsClose');
    const refreshDevices=byId('refreshDevices');
    const settingsSave=byId('settingsSave');
    const inputDevice=byId('inputDevice');
    const outputDevice=byId('outputDevice');
    const deviceStatus=byId('deviceStatus');
    const SETTINGS_KEY='bernieWaveEditor.audioSettings';

    const getSettings=()=>{try{return Object.assign({inputId:'default',outputId:'default'},JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'))}catch{return {inputId:'default',outputId:'default'}}};
    const saveSettings=v=>localStorage.setItem(SETTINGS_KEY,JSON.stringify(v));

    async function scanDevices(requestPermission=true){
      if(!deviceStatus||!inputDevice||!outputDevice)return;
      if(!navigator.mediaDevices?.enumerateDevices){deviceStatus.textContent='Audio device selection is not available on this system.';return;}
      let temp=null;
      try{if(requestPermission)temp=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){}
      try{
        const devices=await navigator.mediaDevices.enumerateDevices();
        const saved=getSettings();
        const inputs=devices.filter(d=>d.kind==='audioinput');
        const outputs=devices.filter(d=>d.kind==='audiooutput');
        inputDevice.innerHTML='<option value="default">System Default</option>';
        outputDevice.innerHTML='<option value="default">System Default</option>';
        inputs.forEach((d,i)=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||('Input '+(i+1));inputDevice.appendChild(o)});
        outputs.forEach((d,i)=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||('Output '+(i+1));outputDevice.appendChild(o)});
        inputDevice.value=[...inputDevice.options].some(o=>o.value===saved.inputId)?saved.inputId:'default';
        outputDevice.value=[...outputDevice.options].some(o=>o.value===saved.outputId)?saved.outputId:'default';
        deviceStatus.textContent='Found '+inputs.length+' input device'+(inputs.length===1?'':'s')+' and '+outputs.length+' output device'+(outputs.length===1?'':'s')+'.';
      }catch(e){deviceStatus.textContent='Could not scan audio devices: '+(e.message||e)}
      finally{if(temp)temp.getTracks().forEach(t=>t.stop())}
    }

    function openSettingsFixed(){if(!settingsPage)return;settingsPage.classList.add('show');settingsPage.setAttribute('aria-hidden','false');scanDevices(true)}
    function closeSettingsFixed(){if(!settingsPage)return;settingsPage.classList.remove('show');settingsPage.setAttribute('aria-hidden','true')}
    if(settingsBtn)settingsBtn.onclick=openSettingsFixed;
    if(settingsClose)settingsClose.onclick=closeSettingsFixed;
    if(refreshDevices)refreshDevices.onclick=()=>scanDevices(true);
    if(settingsSave)settingsSave.onclick=()=>{saveSettings({inputId:inputDevice?.value||'default',outputId:outputDevice?.value||'default'});if(status)status.textContent='Audio device settings saved.';closeSettingsFixed()};
    if(settingsPage)settingsPage.onclick=e=>{if(e.target===settingsPage)closeSettingsFixed()};

    async function getRecordingStream(){
      const saved=getSettings();
      if(saved.inputId&&saved.inputId!=='default'){
        try{
          return await navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:saved.inputId},channelCount:{ideal:2},echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
        }catch(e){
          console.warn('Selected input failed; retrying system default.',e);
        }
      }
      return navigator.mediaDevices.getUserMedia({audio:{channelCount:{ideal:2},echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    }

    if(recBtn){
      recBtn.onclick=async()=>{
        if(typeof rec!=='undefined'&&rec&&rec.state!=='inactive')return;
        try{
          if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone capture is unavailable.');
          if(status)status.textContent='Starting microphone…';

          stream=await getRecordingStream();
          if(!stream||!stream.getAudioTracks().length)throw new Error('No microphone audio track was returned.');

          const ctx=ensureAC();
          if(ctx.state==='suspended')await ctx.resume();
          const ms=ctx.createMediaStreamSource(stream);
          analyser=ctx.createAnalyser();
          analyser.fftSize=1024;
          ms.connect(analyser);

          chunks=[];
          const type=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported?.(t));
          rec=new MediaRecorder(stream,type?{mimeType:type}:undefined);

          livePeaks=[];
          recordStart=performance.now();
          recordingLive=true;
          playhead=0;
          byId('recBadge')?.classList.add('show');
          recBtn.classList.add('active');
          recBtn.textContent='●';
          resize();
          meterLoop();

          rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
          rec.onerror=e=>{console.error('MediaRecorder error',e);if(status)status.textContent='Recorder error: '+(e.error?.message||e.message||'unknown error')};
          rec.onstart=()=>{if(status)status.textContent='RECORDING — live waveform active.'};
          rec.onstop=async()=>{
            recordingLive=false;
            cancelAnimationFrame(meterRAF);
            cancelAnimationFrame(liveWaveRAF);
            analyser=null;
            setMeters(0);
            if(stream)stream.getTracks().forEach(t=>t.stop());
            recBtn.classList.remove('active');
            recBtn.textContent='●';
            byId('recBadge')?.classList.remove('show');
            try{
              const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});
              if(!blob.size)throw new Error('Recorder returned no audio data.');
              const b=await ctx.decodeAudioData(await blob.arrayBuffer());
              playhead=0;
              setBuffer(b,'Recording ready to edit.');
              try{await saveRecordedBufferAsCut()}catch(saveErr){console.error('Shelf save failed',saveErr);if(status)status.textContent='Recording ready to edit. Automatic shelf save failed.'}
            }catch(e){console.error('Recording decode failed',e);if(status)status.textContent='Recording stopped, but the captured audio could not be decoded: '+(e.message||e);resize();draw();update()}
          };

          rec.start(250);

          Promise.resolve().then(async()=>{
            try{
              const name=await nextDefaultFilename();
              pendingRecordFile={name,createdAt:Date.now(),wavBlob:null};
              const filename=byId('filename');
              if(filename&&filename.childNodes.length)filename.childNodes[0].nodeValue=name+' ';
            }catch(e){
              console.error('Filename preparation failed',e);
              pendingRecordFile={name:'Untitled '+Date.now(),createdAt:Date.now(),wavBlob:null};
            }
          });
        }catch(e){
          console.error('Record start failed',e);
          try{pendingRecordFile=null}catch{}
          try{if(stream)stream.getTracks().forEach(t=>t.stop())}catch{}
          if(status)status.textContent='RECORD DID NOT START: '+(e.message||e);
        }
      };
    }
  })();`;
  document.body.appendChild(repair);
});
