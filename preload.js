const { contextBridge } = require('electron');

const versionArg = process.argv.find(arg => arg.startsWith('--bernie-app-version='));
const version = versionArg ? versionArg.split('=')[1] : '0.0.0';
const parts = version.split('.');
const buildNumber = String(parseInt(parts[2] || '0', 10)).padStart(3, '0');
const majorMinor = `${parts[0] || '0'}.${parts[1] || '0'}`;

contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop: true,
  platform: process.platform,
  version,
  buildNumber
});

window.addEventListener('DOMContentLoaded', () => {
  const buildBadge = document.querySelector('.build');
  if (buildBadge) buildBadge.textContent = `VERSION ${majorMinor} · Build ${buildNumber}`;

  const footer = document.querySelector('.footer');
  if (footer) footer.textContent = `Bernie Wave Editor · Version ${majorMinor} · Build ${buildNumber} · Single-track VoxPro-style workflow`;
  document.title = `Bernie Wave Editor — Build ${buildNumber}`;

  const script = document.createElement('script');
  script.textContent = `(() => {
    let selectedChannel = 'both';

    const style = document.createElement('style');
    style.textContent = \`
      .channel-picker{display:flex;gap:6px;align-items:center;margin-left:10px}
      .channel-picker button{min-height:32px;padding:0 10px;font-size:10px}
      .channel-picker button.active{outline:2px solid #49df86;background:#173321}
      .channel-hint{font-size:10px;color:#93a097;margin-left:6px}
    \`;
    document.head.appendChild(style);

    const readouts = document.querySelector('.readouts');
    if (readouts) {
      const picker = document.createElement('div');
      picker.className = 'channel-picker';
      picker.innerHTML = '<strong>Channel:</strong><button type="button" data-ch="left">L</button><button type="button" data-ch="both" class="active">BOTH</button><button type="button" data-ch="right">R</button><span class="channel-hint">Click a waveform lane to target it</span>';
      readouts.appendChild(picker);
      picker.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
        selectedChannel=btn.dataset.ch;
        picker.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));
        draw();
      }));
    }

    const originalSelectedInputConstraints = selectedInputConstraints;
    selectedInputConstraints = function(){
      const base = originalSelectedInputConstraints();
      if(base === true) return {channelCount:{ideal:2}};
      return Object.assign({}, base, {channelCount:{ideal:2}});
    };

    draw = function(){
      const canvas=$('wave');
      const w=canvas.clientWidth,h=330,g=canvas.getContext('2d');
      const half=h/2;
      g.clearRect(0,0,w,h);
      g.fillStyle='#080a09';g.fillRect(0,0,w,h);

      if(selectedChannel==='left'||selectedChannel==='both'){
        g.fillStyle=selectedChannel==='left'?'rgba(73,223,134,.12)':'rgba(73,223,134,.055)';
        g.fillRect(0,0,w,half);
      }
      if(selectedChannel==='right'||selectedChannel==='both'){
        g.fillStyle=selectedChannel==='right'?'rgba(73,223,134,.12)':'rgba(73,223,134,.055)';
        g.fillRect(0,half,w,half);
      }

      g.strokeStyle='#2a332d';g.lineWidth=1;g.beginPath();g.moveTo(0,half+.5);g.lineTo(w,half+.5);g.stroke();
      g.fillStyle='#93a097';g.font='bold 11px Segoe UI';g.fillText('L',8,16);g.fillText('R',8,half+16);

      const s=selection();
      if(s){
        g.fillStyle='rgba(73,223,134,.16)';
        const x=s[0]*zoomPPS, sw=(s[1]-s[0])*zoomPPS;
        if(selectedChannel==='left') g.fillRect(x,0,sw,half);
        else if(selectedChannel==='right') g.fillRect(x,half,sw,half);
        else g.fillRect(x,0,sw,h);
      }

      function drawLane(data, top, laneH){
        const mid=top+laneH/2;
        g.strokeStyle='#49df86';g.lineWidth=1;g.beginPath();
        for(let x=0;x<w;x++){
          let a=Math.floor(x/zoomPPS*buffer.sampleRate),b=Math.floor((x+1)/zoomPPS*buffer.sampleRate),min=1,max=-1;
          let step=Math.max(1,Math.floor((b-a)/16));
          for(let i=a;i<Math.min(b,data.length);i+=step){const v=data[i];if(v<min)min=v;if(v>max)max=v}
          if(max>=min){g.moveTo(x,mid-max*laneH*.43);g.lineTo(x,mid-min*laneH*.43)}
        }
        g.stroke();
      }

      if(recordingLive){
        g.strokeStyle='#49df86';g.lineWidth=1;g.beginPath();
        for(let x=0;x<livePeaks.length;x++){
          const p=livePeaks[x],xx=x*3;
          g.moveTo(xx,half*.5-p*half*.38);g.lineTo(xx,half*.5+p*half*.38);
          g.moveTo(xx,half+half*.5-p*half*.38);g.lineTo(xx,half+half*.5+p*half*.38);
        }
        g.stroke();
      } else if(buffer){
        const left=buffer.getChannelData(0);
        const right=buffer.numberOfChannels>1?buffer.getChannelData(1):left;
        drawLane(left,0,half);
        drawLane(right,half,half);
      }

      g.strokeStyle='#fff';g.lineWidth=1;g.beginPath();g.moveTo(playhead*zoomPPS,0);g.lineTo(playhead*zoomPPS,h);g.stroke();

      const r=$('ruler').getContext('2d');r.clearRect(0,0,w,30);r.fillStyle='#0a0d0b';r.fillRect(0,0,w,30);r.strokeStyle='#546258';r.fillStyle='#89968d';r.font='10px Segoe UI';
      for(let sec=0;sec<=w/zoomPPS;sec++){let x=sec*zoomPPS+.5;r.beginPath();r.moveTo(x,30);r.lineTo(x,sec%5===0?10:18);r.stroke();if(sec%5===0)r.fillText(sec+'s',x+3,10)}
    };

    const wave=$('wave');
    wave.addEventListener('mousedown',e=>{
      const r=wave.getBoundingClientRect();
      selectedChannel=(e.clientY-r.top)<r.height/2?'left':'right';
      const picker=document.querySelector('.channel-picker');
      if(picker) picker.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.ch===selectedChannel));
      setTimeout(draw,0);
    },true);
  })();`;
  document.body.appendChild(script);
});
