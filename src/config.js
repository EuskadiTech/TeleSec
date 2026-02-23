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
}
// CouchDB URI generator from components: host, user, pass, dbname. Host can include protocol or not, but will be normalized to just hostname in the display. If host is empty, returns empty string.
function makeCouchURLDisplay(host, user, pass, dbname) {
  if (!host) return '';
  var display = user + ':' + pass + '@' + host.replace(/^https?:\/\//, '') + '/' + dbname;
  return display;
}
// Auto-configure CouchDB from ?couch=<uri> parameter
if (urlParams.get('couch') != null) {
  try {
    var couchURI = urlParams.get('couch');
    // Normalize URL: add https:// if no protocol specified
    var normalizedUrl = couchURI;
    if (!/^https?:\/\//i.test(couchURI)) {
      normalizedUrl = 'https://' + couchURI;
    }
    var URL_PARSED = parseURL(normalizedUrl);
    var user = URL_PARSED.username || '';
    var pass = URL_PARSED.password || '';
    var dbname = URL_PARSED.pathname ? URL_PARSED.pathname.replace(/^\//, '') : '';
    var host = URL_PARSED.hostname || normalizedUrl;

    // Extract secret from ?secret= parameter if provided
    var secret = urlParams.get('secret') || '';

    // Save to localStorage
    localStorage.setItem('TELESEC_COUCH_URL', 'https://' + host);
    localStorage.setItem('TELESEC_COUCH_DBNAME', dbname);
    localStorage.setItem('TELESEC_COUCH_USER', user);
    localStorage.setItem('TELESEC_COUCH_PASS', pass);
    if (secret) {
      localStorage.setItem('TELESEC_SECRET', secret.toUpperCase());
    }

    // Mark onboarding as complete since we have server config
    localStorage.setItem('TELESEC_ONBOARDING_COMPLETE', 'true');

    // Clean URL by removing the couch parameter
    urlParams.delete('couch');
    urlParams.delete('secret');
    history.replaceState(
      null,
      '',
      location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '') + location.hash.split("?")[0]
    );

    console.log('CouchDB auto-configured from URL parameter');
  } catch (e) {
    console.error('Error auto-configuring CouchDB from URL:', e);
  }
}

// getDBName: prefer explicit CouchDB dbname from settings. Single-group model: default to 'telesec'
function getDBName() {
  const dbname = localStorage.getItem('TELESEC_COUCH_DBNAME') || '';
  if (dbname && dbname.trim() !== '') return dbname.trim();
  return 'telesec';
}
var SECRET = '';
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
// Logout function for sublogin: clears sublogin state and reloads the page without the sublogin parameter
function LogOutTeleSec() {
  SUB_LOGGED_IN = false;
  SUB_LOGGED_IN_DETAILS = false;
  SUB_LOGGED_IN_ID = false;
  document.getElementById('loading').style.display = 'block';
  //Remove sublogin from URL and reload
  urlParams.delete('sublogin');
  history.replaceState(null, '', '?' + urlParams.toString());
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
