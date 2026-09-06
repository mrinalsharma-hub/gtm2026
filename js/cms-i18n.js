/* ── GTM2026 Localization & CMS Engine (Static Compiled Bundles) ── */
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

  // Translate a specific key with fallback
  function t(key, fallback) {
    var lang = getCurrentLanguage();
    var dict = dictionaries[lang] || dictionaries[DEFAULT_LANG] || {};
    if (dict[key] !== undefined && dict[key] !== '') {
      return dict[key];
    }
    var enDict = dictionaries['en'] || {};
    if (enDict[key] !== undefined && enDict[key] !== '') {
      return enDict[key];
    }
    return fallback !== undefined ? fallback : '';
  }

  // Helper to decode HTML entities for attributes and page title
  function decodeEntities(str) {
    if (!str || typeof str !== 'string' || str.indexOf('&') === -1) return str;
    var txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  // Apply translations to all DOM elements with data-i18n and data-i18n-attr
  function applyDOM(lang) {
    lang = lang || getCurrentLanguage();
    var dict = dictionaries[lang] || {};
    var enDict = dictionaries['en'] || {};

    // 1. Text & HTML content elements: [data-i18n="key"]
    var nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var val = dict[key] !== undefined ? dict[key] : (enDict[key] !== undefined ? enDict[key] : null);
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

        // Render content via innerHTML so HTML markup (<br>, <strong>, <em>, <span>, <a>) and entities (&amp;, &nbsp;) are properly rendered
        el.innerHTML = val;
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
          var val = dict[key] !== undefined && dict[key] !== '' ? dict[key] : (enDict[key] !== undefined ? enDict[key] : null);
          if (val !== null) {
            el.setAttribute(attr, decodeEntities(val));
          }
        }
      });
    });

    // 3. Update document title if present
    var titleKey = 'global.title';
    if (dict[titleKey]) {
      document.title = decodeEntities(dict[titleKey]);
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
    applyDOM: applyDOM,
    setDictionary: function(lang, dict) {
      dictionaries[lang] = Object.assign({}, dict);
      applyDOM(lang);
    }
  };

})();
