/* ── GTM2026 Localization & CMS Engine (Static Compiled Bundles + Edition Aware) ── */
(function() {
  'use strict';

  var CURRENT_LANG_KEY = 'gtm2026_lang';
  var DEFAULT_LANG = 'en';

  // Active in-memory dictionaries
  var dictionaries = {
    en: {},
    hi: {}
  };

  // Supported languages
  var SUPPORTED_LANGS = ['en', 'hi'];

  function getWeddingEdition() {
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('key') || params.get('v') || params.get('code') || params.get('edition') || params.get('passcode');
      if (q) {
        var normQ = String(q).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normQ.indexOf('mrinalgarima') !== -1) return 'mrinalgarima';
        if (normQ.indexOf('garimamrinal') !== -1) return 'garimamrinal';
      }
    } catch(e) {}

    var host = (window.location && window.location.hostname ? window.location.hostname : '').toLowerCase();
    if (host.indexOf('mrinalgarima') !== -1) return 'mrinalgarima';
    if (host.indexOf('garimamrinal') !== -1) return 'garimamrinal';
    if (host.indexOf('gtm') !== -1) return 'gtm2026';

    try {
      var stored = (localStorage.getItem('wedding_access_key') || sessionStorage.getItem('wedding_access_key') || localStorage.getItem('gtm2026_auth') || '').toLowerCase();
      if (stored.indexOf('mrinalgarima') !== -1) return 'mrinalgarima';
      if (stored.indexOf('garimamrinal') !== -1) return 'garimamrinal';
    } catch(e) {}

    return 'gtm2026';
  }

  function getCurrentLanguage() {
    try {
      var saved = localStorage.getItem(CURRENT_LANG_KEY);
      if (saved && SUPPORTED_LANGS.indexOf(saved) !== -1) return saved;
      var params = new URLSearchParams(window.location.search);
      var urlLang = params.get('lang');
      if (urlLang && SUPPORTED_LANGS.indexOf(urlLang) !== -1) return urlLang;
    } catch(e) {}
    return DEFAULT_LANG;
  }

  function setLanguage(lang) {
    if (SUPPORTED_LANGS.indexOf(lang) === -1) lang = DEFAULT_LANG;
    try {
      localStorage.setItem(CURRENT_LANG_KEY, lang);
    } catch(e) {}
    document.documentElement.setAttribute('lang', lang);
    applyDOM(lang);
    var event = new CustomEvent('gtm:lang-changed', { detail: { lang: lang } });
    window.dispatchEvent(event);
  }

  // Load static pre-baked dictionary bundle
  function loadPrebaked(lang) {
    var prefix = window.location.pathname.indexOf('/invite/') !== -1 ? '../' : '';
    return fetch(prefix + 'locales/' + lang + '.json?v=' + Date.now())
      .then(function(res) {
        if (res.ok) return res.json();
        throw new Error('Prebaked load failed');
      })
      .then(function(data) {
        dictionaries[lang] = Object.assign({}, data);
        return dictionaries[lang];
      })
      .catch(function() {
        return dictionaries[lang] || {};
      });
  }

  // Translate a specific key with fallback and edition adjustments
  function t(key, fallback) {
    var edition = getWeddingEdition();
    var lang = getCurrentLanguage();
    var dict = dictionaries[lang] || dictionaries[DEFAULT_LANG] || {};
    var val = dict[key] !== undefined && dict[key] !== '' ? dict[key] : ((dictionaries['en'] || {})[key] || '');

    if (edition === 'mrinalgarima') {
      if (key === 'home.hero.bride' || key === 'home.hero.bride_name') return 'MRINAL';
      if (key === 'home.hero.groom' || key === 'home.hero.groom_name') return 'GARIMA';
      if (key === 'global.title') return 'Mrinal & Garima · Nainital 2026';
      if (key === 'global.meta_desc') return 'Mrinal & Garima · A wedding in the Kumaon hills · 20–22 November 2026 · Nainital, Uttarakhand';
      if (key === 'stay.header.banner_line2') return 'MRINAL & GARIMA · 20-22 NOV 2026';
    } else {
      if (key === 'home.hero.bride' || key === 'home.hero.bride_name') return 'GARIMA';
      if (key === 'home.hero.groom' || key === 'home.hero.groom_name') return 'MRINAL';
      if (key === 'global.title') return 'Garima & Mrinal · Nainital 2026';
      if (key === 'global.meta_desc') return 'Garima & Mrinal · A wedding in the Kumaon hills · 20–22 November 2026 · Nainital, Uttarakhand';
      if (key === 'stay.header.banner_line2' && val && val.indexOf('MRINAL') !== -1) return 'GARIMA & MRINAL · 20-22 NOV 2026';
    }

    if (val !== undefined && val !== '') return val;
    return fallback !== undefined ? fallback : '';
  }

  // Helper to decode HTML entities for attributes and page title
  function decodeEntities(str) {
    if (!str || typeof str !== 'string' || str.indexOf('&') === -1) return str;
    var txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  // Apply translations & edition customization to all DOM elements
  function applyDOM(lang) {
    lang = lang || getCurrentLanguage();
    var edition = getWeddingEdition();
    var dict = dictionaries[lang] || {};
    var enDict = dictionaries['en'] || {};

    // 1. Text & HTML content elements: [data-i18n="key"]
    var nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;

      var val = t(key, null);
      if (val === null) {
        val = dict[key] !== undefined ? dict[key] : (enDict[key] !== undefined ? enDict[key] : null);
      }

      if (val !== null) {
        if (val === '') {
          el.innerHTML = '';
          el.style.display = 'none';
          return;
        } else if (el.style.display === 'none') {
          el.style.display = '';
        }

        // Special formatting for stay.header.title_line2 to preserve the cursive Snell Roundhand ampersand
        if (key === 'stay.header.title_line2') {
          if (val.indexOf('<span') === -1) {
            var hasAmp = /&amp;|&/i.test(val);
            var cleanText = val.replace(/^(&amp;|&)\s*/i, '').trim();
            if (hasAmp) {
              el.innerHTML = '<span class="stay-title-amp">&amp;</span><span class="stay-title-stay">' + cleanText + '</span>';
            } else {
              el.innerHTML = '<span class="stay-title-stay">' + cleanText + '</span>';
            }
            return;
          }
        }

        var formattedVal = typeof val === 'string' ? val.replace(/\r\n|\r|\n/g, '<br>') : val;
        el.innerHTML = formattedVal;
      }
    });

    // 2. Attributes: [data-i18n-attr="placeholder:key,aria-label:key"]
    var attrNodes = document.querySelectorAll('[data-i18n-attr]');
    attrNodes.forEach(function(el) {
      var raw = el.getAttribute('data-i18n-attr');
      if (!raw) return;
      var pairs = raw.split(',');
      pairs.forEach(function(pair) {
        var parts = pair.split(':');
        if (parts.length === 2) {
          var attr = parts[0].trim();
          var key = parts[1].trim();
          var val = t(key, null);
          if (val === null) {
            val = dict[key] !== undefined && dict[key] !== '' ? dict[key] : (enDict[key] !== undefined ? enDict[key] : null);
          }
          if (val !== null) {
            el.setAttribute(attr, decodeEntities(val));
          }
        }
      });
    });

    // 3. Update Page Titles based on path and edition
    var path = (window.location.pathname || '').toLowerCase();
    var pageTitle = '';

    if (edition === 'mrinalgarima') {
      if (path.indexOf('celebrat') !== -1) {
        pageTitle = 'The Wedding Weekend · Mrinal & Garima — Nainital 2026';
      } else if (path.indexOf('stay') !== -1 || path.indexOf('travel') !== -1) {
        pageTitle = 'Travel & Stay · Mrinal & Garima — Nainital 2026';
      } else if (path.indexOf('rsvp') !== -1) {
        pageTitle = 'RSVP · Mrinal & Garima — Nainital 2026';
      } else if (path.indexOf('index.html') !== -1 || path === '/' || path === '') {
        pageTitle = 'Mrinal & Garima · Invitation Gateway';
      } else if (path.indexOf('404') !== -1) {
        pageTitle = 'Mrinal & Garima · Nainital 2026';
      } else {
        pageTitle = 'Mrinal & Garima · Nainital 2026';
      }
    } else {
      if (path.indexOf('celebrat') !== -1) {
        pageTitle = 'The Wedding Weekend · Garima & Mrinal — Nainital 2026';
      } else if (path.indexOf('stay') !== -1 || path.indexOf('travel') !== -1) {
        pageTitle = 'Travel & Stay · Garima & Mrinal — Nainital 2026';
      } else if (path.indexOf('rsvp') !== -1) {
        pageTitle = 'RSVP · Garima & Mrinal — Nainital 2026';
      } else if (path.indexOf('index.html') !== -1 || path === '/' || path === '') {
        pageTitle = 'Garima weds Mrinal · Invitation Gateway';
      } else if (path.indexOf('404') !== -1) {
        pageTitle = 'Garima weds Mrinal · Nainital 2026';
      } else {
        pageTitle = 'Garima weds Mrinal · Nainital 2026';
      }
    }

    if (pageTitle) {
      document.title = pageTitle;
    }

    // 4. Update Metadata tags dynamically
    var metaDesc = document.querySelector('meta[name="description"]');
    var ogTitle = document.querySelector('meta[property="og:title"]');
    var ogDesc = document.querySelector('meta[property="og:description"]');
    var appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');

    if (edition === 'mrinalgarima') {
      var descText = 'Mrinal & Garima · A wedding in the Kumaon hills · 20–22 November 2026 · Nainital, Uttarakhand';
      if (metaDesc) metaDesc.setAttribute('content', descText);
      if (ogTitle) ogTitle.setAttribute('content', pageTitle || 'Mrinal & Garima · Nainital 2026');
      if (ogDesc) ogDesc.setAttribute('content', descText);
      if (appleTitle) appleTitle.setAttribute('content', 'M&G 2026');
    } else {
      var descTextG = 'Garima & Mrinal · A wedding in the Kumaon hills · 20–22 November 2026 · Nainital, Uttarakhand';
      if (metaDesc) metaDesc.setAttribute('content', descTextG);
      if (ogTitle) ogTitle.setAttribute('content', pageTitle || 'Garima & Mrinal · Nainital 2026');
      if (ogDesc) ogDesc.setAttribute('content', descTextG);
      if (appleTitle) appleTitle.setAttribute('content', 'GTM 2026');
    }

    // 5. Update Auth Page & G&M Page name elements if rendered in DOM
    var authLine1 = document.querySelector('.auth-name-line-1');
    var authNameText = document.querySelector('.auth-name-text');
    if (authLine1 && authNameText) {
      if (edition === 'mrinalgarima') {
        authLine1.textContent = 'MRINAL';
        authNameText.textContent = 'GARIMA';
      } else {
        authLine1.textContent = 'GARIMA';
        authNameText.textContent = 'MRINAL';
      }
    }

    var gmName1 = document.querySelector('.gxm-name-1, .gxm-name.gxm-garima');
    var gmName2 = document.querySelector('.gxm-name-2, .gxm-name.gxm-mrinal');
    if (gmName1 && gmName2) {
      if (edition === 'mrinalgarima') {
        gmName1.textContent = 'MRINAL';
        gmName2.textContent = 'GARIMA';
      } else {
        gmName1.textContent = 'GARIMA';
        gmName2.textContent = 'MRINAL';
      }
    }
  }

  // Initialization lifecycle
  function init() {
    var lang = getCurrentLanguage();
    document.documentElement.setAttribute('lang', lang);

    // Fetch pre-baked bundles and apply
    Promise.all(SUPPORTED_LANGS.map(loadPrebaked)).then(function() {
      applyDOM(lang);
    });
  }

  // Hook into DOM lifecycle & SPA transitions
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('gtm:spa-page-ready', function() {
    applyDOM();
  });
  window.addEventListener('gtm:page-loaded', function() {
    applyDOM();
  });

  // Public API
  window.GTM_CMS = {
    t: t,
    get: t,
    setLanguage: setLanguage,
    getLanguage: getCurrentLanguage,
    getEdition: getWeddingEdition,
    applyDOM: applyDOM,
    setDictionary: function(lang, dict) {
      dictionaries[lang] = Object.assign({}, dict);
      applyDOM(lang);
    }
  };

})();
