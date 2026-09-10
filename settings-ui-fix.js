window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    .settingsPage{
      padding:12px!important;
      align-items:center!important;
      justify-content:center!important;
      overflow:hidden!important;
    }
    .settingsPanel{
      width:min(760px,96vw)!important;
      height:auto!important;
      max-height:94vh!important;
      display:flex!important;
      flex-direction:column!important;
      overflow:hidden!important;
    }
    .settingsHead,.settingsActions{
      flex:0 0 auto!important;
      padding:10px 12px!important;
    }
    .settingsBody{
      flex:1 1 auto!important;
      min-height:0!important;
      max-height:none!important;
      overflow-y:auto!important;
      padding:12px!important;
      gap:10px!important;
    }
    .settingsBody select{
      min-height:36px!important;
      height:36px!important;
    }
    #fastKeysManager{
      width:100%!important;
      max-height:none!important;
      overflow:visible!important;
    }
    #fastKeysManager[open]{
      display:block!important;
    }
    #fastKeysManager > div{
      grid-template-columns:1fr 1fr!important;
      align-items:center!important;
    }
    #fastKeysManager .status,
    #fastKeysManager #fastKeyCurrent{
      grid-column:1 / -1!important;
    }
    #fastKeysManager #fastKeyAssign,
    #fastKeysManager #fastKeyClear{
      min-height:34px!important;
      height:34px!important;
    }
    @media(max-height:720px){
      .settingsPage{padding:6px!important}
      .settingsPanel{max-height:97vh!important}
      .settingsHead,.settingsActions{padding:7px 9px!important}
      .settingsBody{padding:8px!important;gap:7px!important}
      .settingsBody select{min-height:32px!important;height:32px!important}
      #fastKeysManager{padding:7px!important}
      #fastKeysManager > div{gap:6px!important;margin-top:7px!important}
      #fastKeysManager #fastKeyAssign,
      #fastKeysManager #fastKeyClear{min-height:30px!important;height:30px!important}
    }
  `;
  document.head.appendChild(style);

  const manager = document.getElementById('fastKeysManager');
  if (manager) manager.open = true;
});
