/* ── GTM2026 Native Navigation & Tab Controller ── */
(function() {
  'use strict';

  function normalizePath(url) {
    if (!url) return 'gm.html';
    var path = url.split('?')[0].split('#')[0].split('/').pop();
    if (!path || path === '' || path === 'index.html' || path === 'us.html' || path === 'home.html') return 'gm.html';
    if (path === 'celebrations.html' || path === 'schedule.html') return 'events.html';
    if (path === 'travel.html') return 'stay.html';
    if (path === 'rsvp.html' || path === 'rsvp2.html' || path === 'RSVP.html') return 'joinus.html';
    return path;
  }

  function ensureThemeColor() {
    var themeColor = '#B42425';
    var metaTags = document.querySelectorAll('meta[name="theme-color"]');
    if (!metaTags || metaTags.length === 0) {
      var meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = themeColor;
      document.head.appendChild(meta);
    } else {
      metaTags.forEach(function(m) {
        m.setAttribute('content', themeColor);
      });
    }
    var msNav = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (msNav) msNav.setAttribute('content', themeColor);
  }

  function updateNav() {
    var currentNorm = normalizePath(window.location.pathname);
    var tabs = document.querySelectorAll('.fixed-bottom-nav .nav-tab');
    tabs.forEach(function(tab) {
      var href = tab.getAttribute('href');
      var tabNorm = normalizePath(href);
      if (tabNorm === currentNorm) {
        tab.classList.add('active');
        var label = tab.querySelector('.nav-label');
        var text = label ? label.textContent.trim() : '';
        tab.setAttribute('aria-label', text + ' (Current Page)');
      } else {
        tab.classList.remove('active');
        var label = tab.querySelector('.nav-label');
        var text = label ? label.textContent.trim() : '';
        tab.setAttribute('aria-label', text);
      }
    });
  }

  // Pre-fetch tabs into browser cache for instant transitions
  var TABS = ['gm.html', 'events.html', 'stay.html', 'joinus.html'];
  function prefetchTabs() {
    TABS.forEach(function(page) {
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = page;
      document.head.appendChild(link);
    });
  }

  function init() {
    ensureThemeColor();
    updateNav();
    prefetchTabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
