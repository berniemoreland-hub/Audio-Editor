const { pathToFileURL } = require('url');
const path = require('path');

window.addEventListener('DOMContentLoaded', () => {
  const script = document.createElement('script');
  script.src = pathToFileURL(path.join(__dirname, 'page-fixes.js')).href;
  script.async = false;
  document.documentElement.appendChild(script);
});
