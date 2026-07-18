/* ===== EMPLOYA Bewerbungs-Funnel ===== */
(function () {
  'use strict';

  /* =====================================================================
   *  E-MAIL-KONFIGURATION
   *  -------------------------------------------------------------------
   *  Versand über FormSubmit (https://formsubmit.co) – kostenlos, ohne
   *  Account. WICHTIG: Nach der allerersten Bewerbung schickt FormSubmit
   *  einmalig eine Aktivierungs-Mail an PRIMARY_MAIL. Den Link darin
   *  anklicken – erst danach werden Bewerbungen zugestellt.
   *
   *  PRIMARY_MAIL : bekommt JEDE Bewerbung (Hauptempfänger)
   *  REGION_MAIL  : Standort-Postfach – wird je nach gewählter Region
   *                 automatisch in Kopie (CC) gesetzt
   *
   *  AD-LINKS für Video-Ads:
   *   …/#funnel                → springt direkt zum Funnel
   *   …/?stelle=erzieher       → Stelle vorausgewählt, Start bei Schritt 2
   *   …/?region=bremen         → Region vormarkiert
   *   UTM-Parameter (utm_source, utm_campaign, …) sowie fbclid/gclid/
   *   ttclid werden automatisch erfasst und mit der Bewerbung übermittelt.
   * ===================================================================== */
  // zusammengesetzt, damit Spam-Bots die Adresse nicht aus dem Quellcode ernten
  var PRIMARY_MAIL = ['wendepunkt.marketing', 'gmail.com'].join('@');
  var REGION_MAIL = {
    'Hamburg':            'hamburg@employa.org',
    'Bremen':             'bremen@employa.org',
    'Schleswig-Holstein': 's-h@employa.org',
    'Rendsburg / Umland': 'rendsburg@employa.org'
  };
  var REGION_FON = {
    'Hamburg':            '040 23724579-0',
    'Bremen':             '0421 9480398-0',
    'Schleswig-Holstein': '04102 213477-0',
    'Rendsburg / Umland': '04102 213477-0'
  };
  // Alias von FormSubmit (Spam-Schutz) – gehört zu wendepunkt.marketing@gmail.com
  var FORM_ALIAS = '93e8f93c7f4cdf3dd5d77866a41da786';
  // Keine Datei-Uploads mehr → alles läuft über den AJAX-Endpoint (lesbare Antwort,
  // saubere Fehlerbehandlung; Lead feuert nur bei bestätigtem Erfolg).
  var ENDPOINT_AJAX = 'https://formsubmit.co/ajax/' + (FORM_ALIAS || PRIMARY_MAIL);

  /* =====================================================================
   *  META-PIXEL (Facebook/Instagram-Ads)
   *  -------------------------------------------------------------------
   *  1. Pixel-ID hier eintragen (nur die Zahl, z. B. '1234567890123456').
   *     Zu finden im Meta Events Manager → Datenquellen → dein Pixel.
   *  2. Danach feuert automatisch:
   *       • PageView  – bei jedem Seitenaufruf
   *       • FunnelStart (Custom) – sobald jemand die erste Frage beantwortet
   *       • Lead      – bei erfolgreich abgeschickter Bewerbung (= Conversion)
   *  3. Im Werbeanzeigenmanager die Kampagne auf das Ereignis „Lead"
   *     optimieren – dann lernt Meta, günstige Bewerbungen zu liefern.
   *  Solange die ID leer ist, passiert nichts (kein Fehler).
   * ===================================================================== */
  var META_PIXEL_ID = '3169179053244454';

  function initMetaPixel(id) {
    if (!id) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }

  function metaTrack(event, params, custom) {
    if (!META_PIXEL_ID || !window.fbq) return;
    window.fbq(custom ? 'trackCustom' : 'track', event, params || {});
  }

  /* ---------- Cookie-/Marketing-Consent ----------
   * Der Meta-Pixel lädt ERST nach aktiver Einwilligung (§ 25 TDDDG).
   * Entscheidung wird gespeichert; das Banner erscheint nur, wenn ein
   * Pixel gesetzt ist und noch keine Wahl getroffen wurde. */
  var CONSENT_KEY = 'employa_consent';
  function getConsent() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {} }

  function loadMarketing() { initMetaPixel(META_PIXEL_ID); }

  function initConsent() {
    if (!META_PIXEL_ID) return;              // nichts zu tracken → kein Banner nötig
    var choice = getConsent();
    if (choice === 'granted') { loadMarketing(); return; }
    if (choice === 'denied') { return; }

    var banner = document.getElementById('consentBanner');
    if (!banner) return;
    banner.hidden = false;
    document.getElementById('consentAccept').addEventListener('click', function () {
      setConsent('granted'); banner.hidden = true; loadMarketing();
    });
    document.getElementById('consentDeny').addEventListener('click', function () {
      setConsent('denied'); banner.hidden = true;
    });
  }

  var form        = document.getElementById('funnelForm');
  var steps       = Array.prototype.slice.call(form.querySelectorAll('.step[data-step]'));
  var inputSteps  = steps.filter(function (s) { return s.dataset.step !== 'done'; });
  var totalSteps  = inputSteps.length;            // 7
  var progressBar = document.getElementById('progressBar');
  var stepLabel   = document.getElementById('stepLabel');
  var stepPct     = document.getElementById('stepPct');
  var backBtn     = document.getElementById('backBtn');
  var funnelNav   = form.querySelector('.funnel-nav');
  var submitBtn   = document.getElementById('submitBtn');

  var data = {};             // gesammelte Antworten
  var current = 1;           // 1-basierter Schritt-Index
  var booted = false;        // verhindert Auto-Scroll beim ersten Rendern
  var funnelStarted = false; // Meta: FunnelStart nur einmal feuern

  /* ---------- Werbe-Tracking (UTM & Klick-IDs aus Video-Ads) ---------- */
  var qs = new URLSearchParams(location.search);
  var TRACK_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'];
  var tracking = {};
  try {
    tracking = JSON.parse(sessionStorage.getItem('employa_tracking') || '{}');
    TRACK_KEYS.forEach(function (k) { if (qs.get(k)) tracking[k] = qs.get(k); });
    sessionStorage.setItem('employa_tracking', JSON.stringify(tracking));
  } catch (e) { /* Tracking ist optional */ }

  /* ---------- Navigation ---------- */
  function showStep(n) {
    steps.forEach(function (s) { s.classList.remove('is-active'); });
    var target = form.querySelector('.step[data-step="' + n + '"]');
    if (target) target.classList.add('is-active');

    if (n === totalSteps) renderRecap();

    if (typeof n === 'number') {
      current = n;
      var pct = Math.min(Math.round(n / totalSteps * 100), 100);
      progressBar.style.width = pct + '%';
      stepLabel.textContent = 'Schritt ' + n + ' von ' + totalSteps;
      stepPct.textContent = pct + '%';
      backBtn.hidden = n === 1;
    }
    // Funnel auf kleineren Screens in den Blick holen (nicht beim Laden)
    if (booted && window.innerWidth < 920) {
      document.getElementById('funnel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function next() {
    if (current < totalSteps) showStep(current + 1);
  }

  backBtn.addEventListener('click', function () {
    if (current > 1) showStep(current - 1);
  });

  /* ---------- Options-Auswahl (springt automatisch weiter) ---------- */
  form.querySelectorAll('.options[data-auto]').forEach(function (group) {
    var field = group.dataset.field;
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('.option');
      if (!btn) return;
      group.querySelectorAll('.option').forEach(function (o) { o.classList.remove('selected'); });
      btn.classList.add('selected');
      data[field] = btn.dataset.value;
      // Meta: Funnel-Einstieg genau einmal melden (erste beantwortete Frage)
      if (!funnelStarted) { funnelStarted = true; metaTrack('FunnelStart', { content_name: data.position || btn.dataset.value }, true); }
      // kurze Pause, damit die Auswahl sichtbar ist
      setTimeout(next, 220);
    });
  });

  /* ---------- Validierung ---------- */
  function setError(name, msg) {
    var el = form.querySelector('[data-error-for="' + name + '"]');
    if (el) el.textContent = msg || '';
  }
  function markInvalid(input, bad) {
    input.classList.toggle('invalid', bad);
  }

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var phoneRe = /^[+()/\d\s-]{6,}$/;

  function validateContact() {
    var name    = form.querySelector('#f-name');
    var email   = form.querySelector('#f-email');
    var phone   = form.querySelector('#f-phone');
    var privacy = form.querySelector('#f-privacy');
    var ok = true;

    if (name.value.trim().length < 2) { setError('name', 'Bitte gib deinen Namen ein.'); markInvalid(name, true); ok = false; }
    else { setError('name', ''); markInvalid(name, false); }

    if (!emailRe.test(email.value.trim())) { setError('email', 'Bitte gib eine gültige E-Mail-Adresse ein.'); markInvalid(email, true); ok = false; }
    else { setError('email', ''); markInvalid(email, false); }

    if (!phoneRe.test(phone.value.trim())) { setError('telefon', 'Bitte gib eine gültige Telefonnummer ein.'); markInvalid(phone, true); ok = false; }
    else { setError('telefon', ''); markInvalid(phone, false); }

    if (!privacy.checked) { setError('privacy', 'Bitte stimme der Datenverarbeitung zu.'); ok = false; }
    else { setError('privacy', ''); }

    if (!ok) {
      var firstInvalid = form.querySelector('.step[data-step="' + totalSteps + '"] .invalid');
      if (firstInvalid) firstInvalid.focus();
    }
    return ok;
  }

  // Fehler ausblenden, sobald getippt wird
  ['#f-name', '#f-phone', '#f-email'].forEach(function (sel) {
    var input = form.querySelector(sel);
    input.addEventListener('input', function () { input.classList.remove('invalid'); });
  });

  /* ---------- Recap + Mail-Route im letzten Schritt ---------- */
  function renderRecap() {
    var recap = document.getElementById('recap');
    if (recap) {
      var rows = [
        ['Stelle', data.position],
        ['Bereich', data.bereich],
        ['Erfahrung', data.erfahrung],
        ['Region', data.region],
        ['Arbeitszeit', data.arbeitszeit],
        ['Mobilität', data.mobilitaet]
      ].filter(function (r) { return r[1]; });
      recap.innerHTML =
        '<div class="recap-title">Deine Auswahl</div>' +
        '<div class="recap-tags">' +
        rows.map(function (r) { return '<span class="recap-tag"><b>' + r[0] + ':</b> ' + r[1] + '</span>'; }).join('') +
        '</div>';
    }
    var route = document.getElementById('mailRoute');
    if (route) {
      var mail = REGION_MAIL[data.region];
      route.innerHTML = mail
        ? '📬 Deine Bewerbung geht direkt an dein Team in <b>' + data.region + '</b> (' + mail + ')'
        : '📬 Deine Bewerbung geht direkt an unser Recruiting-Team';
    }
  }

  /* ---------- Absenden ---------- */
  function setSubmitting(active) {
    submitBtn.disabled = active;
    submitBtn.textContent = active ? 'Wird gesendet …' : 'Bewerbung übermitteln →';
  }

  function collectContact() {
    data.name      = form.querySelector('#f-name').value.trim();
    data.email     = form.querySelector('#f-email').value.trim();
    data.telefon   = form.querySelector('#f-phone').value.trim();
    data.nachricht = form.querySelector('#f-nachricht').value.trim();
    data.zeitpunkt = new Date().toISOString();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateContact()) return;
    collectContact();
    document.getElementById('submitError').hidden = true;
    setSubmitting(true);
    submitBewerbung().then(function () {
      showSuccess();
    }, function (err) {
      console.warn('Versand fehlgeschlagen:', err);
      showSubmitError();
    });
  });

  function submitBewerbung() {
    saveBackup();

    var region = data.region || '';
    var ccMail = REGION_MAIL[region] || '';

    var vorname = (data.name || '').split(' ')[0];

    var fd = new FormData();
    // Steuerung für FormSubmit
    fd.append('_subject', 'Neue Bewerbung: ' + (data.position || 'Initiativ') + ' – ' + (region || 'ohne Region') + ' – ' + data.name);
    if (ccMail) fd.append('_cc', ccMail);           // Standort-Postfach in Kopie
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');
    var honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value) fd.append('_honey', honey.value);   // Spam-Falle
    // Automatische Bestätigungs-Mail an den/die Bewerber:in
    fd.append('_autoresponse',
      'Hallo ' + vorname + ',\n\n' +
      'vielen Dank für deine Bewerbung bei EMPLOYA! Deine Angaben sind sicher bei uns angekommen – ' +
      'ein:e Personalberater:in aus deinem Team ' + (region || 'Norddeutschland') + ' meldet sich innerhalb von 24 Stunden bei dir.\n\n' +
      'Bis gleich!\nDein EMPLOYA-Team – Für eine gute Pflege' +
      (REGION_FON[region] ? '\nTelefon: ' + REGION_FON[region] : ''));

    // Antworten aus dem Funnel
    fd.append('Stelle', data.position || '-');
    fd.append('Bereich', data.bereich || '-');
    fd.append('Berufserfahrung', data.erfahrung || '-');
    fd.append('Region / Niederlassung', region + (ccMail ? ' (' + ccMail + ')' : ''));
    fd.append('Arbeitszeit', data.arbeitszeit || '-');
    fd.append('Mobilität', data.mobilitaet || '-');
    fd.append('Name', data.name);
    fd.append('email', data.email);                 // Standardfeld → Reply-To + Autoresponse
    fd.append('Rufnummer', data.telefon);
    fd.append('Nachricht', data.nachricht || '-');

    // Werbe-Tracking (welche Ad hat die Bewerbung gebracht?)
    Object.keys(tracking).forEach(function (k) { fd.append('Ad-' + k, tracking[k]); });
    fd.append('Übermittelt am', new Date().toLocaleString('de-DE'));
    fd.append('Seite', location.href);

    return fetch(ENDPOINT_AJAX, {
      method: 'POST',
      body: fd,
      headers: { 'Accept': 'application/json' }
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok || String(json.success) === 'false') {
          throw new Error(json.message || ('HTTP ' + res.status));
        }
        return json;
      });
    });
  }

  function saveBackup() {
    try {
      var list = JSON.parse(localStorage.getItem('employa_bewerbungen') || '[]');
      list.push(JSON.parse(JSON.stringify(data)));
      localStorage.setItem('employa_bewerbungen', JSON.stringify(list));
    } catch (e) { /* Backup ist optional */ }
  }

  function buildTextSummary() {
    return [
      'Bewerbung über den Online-Funnel',
      '',
      'Stelle: ' + (data.position || '-'),
      'Bereich: ' + (data.bereich || '-'),
      'Erfahrung: ' + (data.erfahrung || '-'),
      'Region: ' + (data.region || '-'),
      'Arbeitszeit: ' + (data.arbeitszeit || '-'),
      'Mobilität: ' + (data.mobilitaet || '-'),
      '',
      'Name: ' + (data.name || '-'),
      'E-Mail: ' + (data.email || '-'),
      'Telefon: ' + (data.telefon || '-'),
      '',
      'Nachricht:',
      (data.nachricht || '-')
    ].join('\n');
  }

  function showSubmitError() {
    setSubmitting(false);
    var box = document.getElementById('submitError');
    var to = REGION_MAIL[data.region] || PRIMARY_MAIL;
    var cc = to === PRIMARY_MAIL ? '' : '&cc=' + PRIMARY_MAIL;
    box.querySelector('a').href = 'mailto:' + to +
      '?subject=' + encodeURIComponent('Bewerbung: ' + (data.position || '') + ' – ' + (data.region || '')) +
      cc +
      '&body=' + encodeURIComponent(buildTextSummary());
    box.hidden = false;
  }

  function showSuccess() {
    var firstName = (data.name || '').split(' ')[0];
    document.getElementById('successName').textContent = firstName || 'wir haben deine Anfrage';
    var contact = document.getElementById('successContact');
    var fon = REGION_FON[data.region];
    var mail = REGION_MAIL[data.region];
    if (contact && fon) {
      contact.innerHTML = 'Du magst nicht warten? Dein Team <b>' + data.region + '</b> ist direkt erreichbar:<br>' +
        '📞 <a href="tel:' + fon.replace(/[^\d+]/g, '') + '">' + fon + '</a> · ' +
        '✉️ <a href="mailto:' + mail + '">' + mail + '</a>';
    }
    // Meta: Conversion melden – DAS ist das Ereignis, auf das die Ads optimiert werden
    metaTrack('Lead', {
      content_name: data.position || 'Bewerbung',
      content_category: data.region || '',
      currency: 'EUR',
      value: 1
    });
    progressBar.style.width = '100%';
    stepLabel.textContent = 'Fertig!';
    stepPct.textContent = '100%';
    backBtn.hidden = true;
    funnelNav.hidden = true;
    showStep('done');
  }

  /* ---------- Vorauswahl per Ad-Link (?stelle=…, ?region=…) ---------- */
  function preselect(field, wanted) {
    if (!wanted) return false;
    wanted = wanted.toLowerCase();
    var group = form.querySelector('.options[data-field="' + field + '"]');
    if (!group) return false;
    var btns = group.querySelectorAll('.option');
    for (var i = 0; i < btns.length; i++) {
      var v = btns[i].dataset.value.toLowerCase();
      if (v.indexOf(wanted) !== -1 || wanted.indexOf(v) !== -1) {
        btns[i].classList.add('selected');
        data[field] = btns[i].dataset.value;
        return true;
      }
    }
    return false;
  }

  /* ---------- Init ---------- */
  initConsent();   // Meta-Pixel lädt erst nach Einwilligung (Banner)

  var startStep = 1;
  if (preselect('position', qs.get('stelle'))) startStep = 2;
  preselect('region', qs.get('region'));
  showStep(startStep);
  booted = true;

  // Ad-Traffic: auf kleinen Screens direkt zum Funnel scrollen
  if (window.innerWidth < 920 && (tracking.utm_source || location.hash === '#funnel')) {
    setTimeout(function () {
      document.getElementById('funnel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
})();
