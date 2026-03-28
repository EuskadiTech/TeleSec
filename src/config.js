// Syntax helper for HTML template literals (e.g. html`<div>${content}</div>`)
const html = (strings, ...values) => String.raw({ raw: strings }, ...values);

// Global Event Listeners registry for cleanup on logout or other events. Each category can be used to track different types of listeners (e.g., GunJS events, timeouts, intervals, QRScanner events, custom events).
var EventListeners = {
  GunJS: [],
  Timeout: [],
  Interval: [],
  QRScanner: [],
  Custom: [],
  DB: [],
};

// Safe UUID for html element IDs: generates a unique identifier with a specified prefix, ensuring it is safe for use in HTML element IDs. It uses crypto.randomUUID if available, with a fallback to a random string generation method for environments that do not support it. The generated ID is prefixed to avoid collisions and ensure uniqueness across the application.
function safeuuid(prefix = 'AXLUID_') {
  if (!crypto.randomUUID) {
    // Fallback for environments without crypto.randomUUID()
    const randomPart = Math.random().toString(36).substring(2, 10);
    return prefix + randomPart;
  }
  return prefix + crypto.randomUUID().split('-')[4];
}

function parseURL(input) {
  try {
    return new URL(input);
  } catch (e) {
    try {
      return new URL('https://' + input);
    } catch (e2) {
      return { hostname: '', username: '', password: '', pathname: '' };
    }
  }
}
var urlParams = new URLSearchParams(location.search);
var AC_BYPASS = false;
if (urlParams.get('ac_bypass') == 'yes') {
  AC_BYPASS = true;
}
if (urlParams.get('hidenav') != undefined) {
  document.getElementById('header_hide_query').style.display = 'none';
  var sidebar = document.querySelector('.main-sidebar');
  if (sidebar) sidebar.style.display = 'none';
  var cw = document.querySelector('.content-wrapper');
  if (cw) cw.style.marginLeft = '0';
}
// Auto-configure backend API URL from ?api=<url> query parameter
if (urlParams.get('api') != null) {
  try {
    var apiUrl = (urlParams.get('api') || '').trim().replace(/\/$/, '');
    if (apiUrl) {
      localStorage.setItem('TELESEC_API_URL', apiUrl);
      localStorage.setItem('TELESEC_ONBOARDING_COMPLETE', 'true');
    }
    urlParams.delete('api');
    history.replaceState(
      null,
      '',
      location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '') + location.hash.split('?')[0]
    );
    console.log('Backend API URL auto-configured from URL parameter');
  } catch (e) {
    console.error('Error auto-configuring API URL:', e);
  }
}

// Backward-compat: if old CouchDB URL is set but no API URL, prompt user to reconfigure
// (no automatic migration – user must login fresh)
var SECRET = ''; // kept for backward-compat with any remaining TS_decrypt calls
var SUB_LOGGED_IN = false;
var SUB_LOGGED_IN_DETAILS = false;
var SUB_LOGGED_IN_ID = false;
var SAVE_WAIT = 500;
var SC_Personas = {};
var PeerConnectionInterval = 5000;
if (urlParams.get('sublogin') != null) {
  SUB_LOGGED_IN = true;
  SUB_LOGGED_IN_ID = urlParams.get('sublogin');
  SUB_LOGGED_IN_DETAILS = SC_Personas[SUB_LOGGED_IN_ID];
  var sli = 15;
  var slii = setInterval(() => {
    SUB_LOGGED_IN_DETAILS = SC_Personas[SUB_LOGGED_IN_ID];
    sli -= 1;
    if (sli < 0) {
      clearInterval(slii);
    }
  }, 500);
}
// Logout: clears session state, stops replication, and reloads
function LogOutTeleSec() {
  SUB_LOGGED_IN = false;
  SUB_LOGGED_IN_DETAILS = false;
  SUB_LOGGED_IN_ID = false;
  // Clear JWT tokens
  localStorage.removeItem('TELESEC_JWT');
  localStorage.removeItem('TELESEC_REFRESH_TOKEN');
  localStorage.removeItem('TELESEC_PERSONA_ID');
  localStorage.removeItem('TELESEC_TENANT_ID');
  localStorage.removeItem('TELESEC_TENANT_NAME');
  // Stop background replication
  if (typeof DB !== 'undefined' && DB.stopReplication) {
    try { DB.stopReplication(); } catch (e) {}
  }
  document.getElementById('loading').style.display = 'block';
  location.reload();
}
var TTS_RATE = parseFloat(urlParams.get('tts_rate')) || 0.75;
function TS_SayTTS(msg) {
  try {
    if (window.speechSynthesis) {
      let utterance = new SpeechSynthesisUtterance(msg);
      utterance.rate = TTS_RATE;
      speechSynthesis.speak(utterance);
    }
  } catch { console.warn('TTS error'); }
}

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}