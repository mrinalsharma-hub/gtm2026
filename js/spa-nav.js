/* ── GTM2026 Canonical 4-Tab Navigation & Auth Controller ── */
(function() {
  'use strict';

  function normalizePath(url) {
    if (!url) return 'index.html';
    var path = url.split('?')[0].split('#')[0].split('/').pop();
    try { path = decodeURIComponent(path); } catch(e) {}
    if (!path || path === '' || path === 'index.html' || path === 'us.html' || path === 'home.html' || path === 'gm.html' || path === 'g&m.html' || path === 'g%26m.html') {
      return 'index.html';
    }
    if (path === 'celebrations.html' || path === 'schedule.html') return 'events.html';
    if (path === 'travel.html') return 'stay.html';
    if (path === 'rsvp.html' || path === 'rsvp2.html' || path === 'RSVP.html') return 'joinus.html';
    return path;
  }

  function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function isAuthenticated() {
    return (
      sessionStorage.getItem('gtm2026_auth') === 'true' ||
      localStorage.getItem('gtm2026_auth') === 'true' ||
      localStorage.getItem('gtm2026_has_authenticated') === 'true' ||
      getCookie('gtm2026_auth') === 'true' ||
      getCookie('gtm2026_has_authenticated') === 'true'
    );
  }

  function setPersistentAuth() {
    try {
      sessionStorage.setItem('gtm2026_auth', 'true');
      localStorage.setItem('gtm2026_auth', 'true');
      localStorage.setItem('gtm2026_has_authenticated', 'true');
      var maxAge = 365 * 24 * 60 * 60;
      document.cookie = 'gtm2026_auth=true; max-age=' + maxAge + '; path=/; SameSite=Lax';
      document.cookie = 'gtm2026_has_authenticated=true; max-age=' + maxAge + '; path=/; SameSite=Lax';
    } catch(e) {}
  }

  // Ensure persistent storage synchronization
  if (isAuthenticated()) {
    setPersistentAuth();
  }

  function checkAuthGuard() {
    var currentNorm = normalizePath(window.location.pathname);
    if (currentNorm !== 'index.html' && !isAuthenticated()) {
      window.location.replace('index.html');
      return false;
    }
    return true;
  }

  function ensureThemeColor() {
    var themeColor = '#A71F23';
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
    var authed = isAuthenticated();
    var tabs = document.querySelectorAll('.fixed-bottom-nav .nav-tab');

    tabs.forEach(function(tab) {
      var href = tab.getAttribute('href');
      var tabNorm = normalizePath(href);

      // Active indicator
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

      // Lock state
      if (tabNorm !== 'index.html') {
        if (!authed) {
          tab.classList.add('is-locked');
          tab.onclick = function(e) {
            if (!isAuthenticated()) {
              e.preventDefault();
              e.stopPropagation();
              if (window.handleOpenDetails) {
                window.handleOpenDetails(e);
              } else {
                window.location.href = 'index.html';
              }
            }
          };
        } else {
          tab.classList.remove('is-locked');
          tab.onclick = null;
        }
      } else {
        tab.classList.remove('is-locked');
      }
    });
  }

  // Pre-fetch canonical tabs into browser cache for instant transitions
  var TABS = ['index.html', 'events.html', 'stay.html', 'joinus.html'];
  function prefetchTabs() {
    if (!isAuthenticated()) return;
    TABS.forEach(function(page) {
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = page;
      document.head.appendChild(link);
    });
  }

  function init() {
    if (!checkAuthGuard()) return;
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
