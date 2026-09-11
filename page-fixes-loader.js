const { pathToFileURL } = require('url');
const path = require('path');

window.addEventListener('DOMContentLoaded', () => {
  const load = file => new Promise(resolve => {
    const script = document.createElement('script');
    script.src = pathToFileURL(path.join(__dirname, file)).href;
    script.async = false;
    script.onload = resolve;
    script.onerror = resolve;
    document.documentElement.appendChild(script);
  });
  load('page-fixes.js').then(() => load('voxpro-features.js'));
});
