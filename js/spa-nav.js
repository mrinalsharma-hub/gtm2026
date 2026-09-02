/* ── GTM2026 Seamless Universal SPA Navigation & Auth Controller ── */
(function() {
  'use strict';

  function normalizePath(url) {
    if (!url) return 'index.html';
    var path = url.split('?')[0].split('#')[0].split('/').pop();
    try { path = decodeURIComponent(path); } catch(e) {}
    if (!path || path === '' || path === 'index.html') {
      return 'index.html';
    }
    if (path === 'G&M.html' || path === 'g&m.html' || path === 'gm.html' || path === 'home.html' || path === 'us.html') return 'G&M.html';
    if (path === 'celebrations.html' || path === 'events.html' || path === 'schedule.html') return 'celebrations.html';
    if (path === 'stay.html' || path === 'travel.html') return 'stay.html';
    if (path === 'joinus.html' || path === 'rsvp.html' || path === 'rsvp2.html' || path === 'RSVP.html') return 'joinus.html';
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

  function ensureThemeColor(forceNorm) {
    var path = (window.location.pathname || '').toLowerCase();
    var currentNorm = forceNorm || normalizePath(window.location.pathname);
    var themeColor = '#A71F23';

    if (currentNorm === 'celebrations.html' || path.indexOf('celebrations.html') !== -1) {
      themeColor = '#FFEFD4';
    } else if (currentNorm === 'joinus.html' || currentNorm === 'rsvp.html' || path.indexOf('joinus.html') !== -1 || path.indexOf('rsvp.html') !== -1) {
      themeColor = '#B02428';
    } else if (currentNorm === 'stay.html' || path.indexOf('stay.html') !== -1) {
      themeColor = '#A71F23';
    } else {
      themeColor = '#A71F23';
    }

    if (document.documentElement) {
      document.documentElement.style.backgroundColor = themeColor;
    }

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

    var lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]');
    if (lightMeta) lightMeta.setAttribute('content', themeColor);
    var darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]');
    if (darkMeta) darkMeta.setAttribute('content', themeColor);

    var msMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (msMeta) msMeta.setAttribute('content', themeColor);
  }
  window.ensureThemeColor = ensureThemeColor;

  function updateNav(currentNorm) {
    currentNorm = currentNorm || normalizePath(window.location.pathname);
    var authed = isAuthenticated();
    var tabs = document.querySelectorAll('.fixed-bottom-nav .nav-tab');
    var navEl = document.querySelector('.fixed-bottom-nav');

    if (navEl) {
      if (currentNorm === 'joinus.html' || currentNorm === 'rsvp.html') {
        navEl.classList.add('nav-theme-red');
      } else {
        navEl.classList.remove('nav-theme-red');
      }
    }

    tabs.forEach(function(tab) {
      var href = tab.getAttribute('href');
      var tabNorm = normalizePath(href);

      if (tabNorm === currentNorm && (authed || currentNorm !== 'index.html')) {
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

      if (!authed) {
        tab.classList.add('is-locked');
      } else {
        tab.classList.remove('is-locked');
      }
    });
  }

  // Pre-fetch tabs into memory cache
  var pageCache = {};
  var TABS = ['G&M.html', 'stay.html', 'celebrations.html', 'joinus.html'];

  function prefetchPage(url) {
    if (!url || pageCache[url]) return;
    fetch(url + (url.indexOf("?") !== -1 ? "&" : "?") + "_spa=" + Date.now())
      .then(function(res) { return res.text(); })
      .then(function(html) { pageCache[url] = html; })
      .catch(function() {});
  }

  function prefetchAll() {
    if (!isAuthenticated()) return;
    TABS.forEach(prefetchPage);
  }

  // ── Seamless In-Place SPA Page Transition ──
  var isNavigating = false;

  function loadPageSPA(targetUrl, pushState) {
    if (isNavigating) return;
    var targetNorm = normalizePath(targetUrl);
    var currentNorm = normalizePath(window.location.pathname);

    // If already on the same page, do nothing
    if (targetNorm === currentNorm && pushState !== false) return;

    // If unauthenticated and trying to go to protected pages
    if (targetNorm !== 'index.html' && !isAuthenticated()) {
      if (window.handleOpenDetails) {
        window.handleOpenDetails();
      } else {
        window.location.href = 'index.html';
      }
      return;
    }

    isNavigating = true;

    // Instant Feedback: Switch theme-color and active tab immediately on tap
    ensureThemeColor(targetNorm);
    updateNav(targetNorm);

    function applyHTML(html) {
      var parser = new DOMParser();
      var newDoc = parser.parseFromString(html, 'text/html');

      // 1. Update Document Title
      if (newDoc.title) {
        document.title = newDoc.title;
      }

      // 2. Update Dynamic Page Styles
      var oldStyles = document.querySelectorAll('style[data-spa-page], #page-styles');
      oldStyles.forEach(function(s) { s.remove(); });

      var newStyles = newDoc.querySelectorAll('style');
      newStyles.forEach(function(s) {
        var cloneStyle = document.createElement('style');
        cloneStyle.setAttribute('data-spa-page', 'true');
        cloneStyle.textContent = s.textContent;
        document.head.appendChild(cloneStyle);
      });

      // 3. Update Body styling / classes
      document.body.className = newDoc.body.className;

      // 4. Swap Content Nodes (Leave Audio Player & Fixed Nav completely uninterrupted)
      // Elements to PRESERVE: #global-music-player, #bg-music, .fixed-bottom-nav
      var preservedPlayer = document.getElementById('global-music-player');
      var preservedAudio = document.getElementById('bg-music') || window.__GTM_AUDIO__;
      var preservedNav = document.querySelector('.fixed-bottom-nav');

      // Strip any audio players or audio elements from the incoming document before adoption
      var incomingPlayers = newDoc.querySelectorAll('#global-music-player, #music-toggle, .celebration-player-btn, .global-audio-pill');
      incomingPlayers.forEach(function(el) { el.remove(); });
      var incomingAudios = newDoc.querySelectorAll('#bg-music, audio');
      incomingAudios.forEach(function(el) { el.remove(); });

      // Remove existing non-preserved content from body
      var nodesToRemove = [];
      Array.from(document.body.childNodes).forEach(function(node) {
        if (node === preservedPlayer || node === preservedAudio || node === preservedNav) return;
        if (node.nodeType === 1 && (node.id === 'global-music-player' || node.id === 'bg-music' || node.classList.contains('fixed-bottom-nav') || node.classList.contains('celebration-player-btn'))) return;
        nodesToRemove.push(node);
      });
      nodesToRemove.forEach(function(node) { node.remove(); });

      // Insert new content nodes before the nav/player
      Array.from(newDoc.body.childNodes).forEach(function(node) {
        if (node.nodeType === 1) {
          if (node.id === 'global-music-player' || node.id === 'bg-music' || node.classList.contains('fixed-bottom-nav') || node.classList.contains('celebration-player-btn')) return;
        }
        var adopted = document.adoptNode(node);
        if (preservedNav && preservedNav.parentNode === document.body) {
          document.body.insertBefore(adopted, preservedNav);
        } else {
          document.body.appendChild(adopted);
        }
      });

      // Ensure preservedPlayer and preservedAudio sit cleanly as direct children of document.body
      if (preservedPlayer) {
        if (preservedNav && preservedNav.parentNode === document.body) {
          document.body.insertBefore(preservedPlayer, preservedNav);
        } else {
          document.body.appendChild(preservedPlayer);
        }
      }
      if (preservedAudio && preservedAudio.parentNode !== document.body) {
        document.body.appendChild(preservedAudio);
      }

      // Purge any accidental duplicates that might exist anywhere in DOM
      var allLivePlayers = document.querySelectorAll('#global-music-player, .celebration-player-btn');
      if (allLivePlayers.length > 1) {
        for (var i = 1; i < allLivePlayers.length; i++) {
          allLivePlayers[i].remove();
        }
      }

      // 5. Update URL History
      if (pushState !== false) {
        history.pushState({ path: targetUrl }, newDoc.title, targetUrl);
      }

      // 6. Update Active Navigation Tab & Theme Color
      updateNav(targetNorm);
      ensureThemeColor(targetNorm);

      // 7. Ensure audio player is bound and in sync
      if (window.GTM_AUDIO && window.GTM_AUDIO.bindPlayer) {
        window.GTM_AUDIO.bindPlayer();
      }

      // 8. Re-execute page scripts in the new content
      var scripts = document.body.querySelectorAll('script');
      scripts.forEach(function(oldScript) {
        if (oldScript.src && (oldScript.src.indexOf('spa-nav.js') !== -1 || oldScript.src.indexOf('global-audio.js') !== -1)) return;
        var newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(function(attr) {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.innerHTML) {
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        }
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

      // 9. Dispatch custom ready event for page scripts
      document.dispatchEvent(new Event('DOMContentLoaded'));
      window.dispatchEvent(new CustomEvent('gtm:page-loaded', { detail: { url: targetUrl, name: targetNorm } }));

      // Scroll smoothly to top of the new page container
      window.scrollTo(0, 0);
      var mainWrap = document.querySelector('.schedule-page-wrap, main, .stay-container, .rsvp-page-wrap');
      if (mainWrap) {
        mainWrap.scrollTop = 0;
      }

      isNavigating = false;
    }

    if (pageCache[targetUrl]) {
      applyHTML(pageCache[targetUrl]);
    } else {
      fetch(targetUrl + (targetUrl.indexOf("?") !== -1 ? "&" : "?") + "_spa=" + Date.now())
        .then(function(res) {
          if (!res.ok) throw new Error('Page fetch failed');
          return res.text();
        })
        .then(function(html) {
          pageCache[targetUrl] = html;
          applyHTML(html);
        })
        .catch(function(err) {
          console.error('SPA navigation fallback to full load:', err);
          window.location.href = targetUrl;
        });
    }
  }

  // Instant Tap / Touchdown Theme Trigger: Switch address bar color the exact moment finger touches tab
  function onNavTouchStart(e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || link.target === '_blank') return;
    var targetNorm = normalizePath(href);
    if (isAuthenticated() || targetNorm === 'index.html') {
      ensureThemeColor(targetNorm);
      updateNav(targetNorm);
    }
  }

  document.addEventListener('touchstart', onNavTouchStart, { capture: true, passive: true });
  document.addEventListener('pointerdown', onNavTouchStart, { capture: true, passive: true });

  // Intercept all internal navigation clicks globally
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    if (link.target === '_blank') return;
    if (link.classList.contains('no-spa')) return;

    var targetNorm = normalizePath(href);
    var currentNorm = normalizePath(window.location.pathname);

    // If clicking a locked tab when unauthenticated
    if (!isAuthenticated() && targetNorm !== 'index.html') {
      e.preventDefault();
      e.stopPropagation();
      if (window.handleOpenDetails) {
        window.handleOpenDetails(e);
      } else {
        window.location.href = 'index.html';
      }
      return;
    }

    // Process SPA transition
    e.preventDefault();
    loadPageSPA(href, true);
  }, { capture: true });

  // Handle browser Back / Forward buttons
  window.addEventListener('popstate', function(e) {
    loadPageSPA(window.location.pathname, false);
  });

  function init() {
    if (!checkAuthGuard()) return;
    ensureThemeColor();
    updateNav();
    prefetchAll();

    window.addEventListener('focus', function() { ensureThemeColor(); }, { passive: true });
    window.addEventListener('visibilitychange', function() { ensureThemeColor(); }, { passive: true });
    window.addEventListener('pageshow', function() { ensureThemeColor(); }, { passive: true });

    // Cache the initial page HTML
    var currentPath = window.location.pathname.split('/').pop() || 'index.html';
    pageCache[currentPath] = document.documentElement.outerHTML;
  }

  // Expose loadPageSPA globally
  window.GTM_SPA = {
    navigateTo: loadPageSPA,
    updateNav: updateNav,
    normalizePath: normalizePath,
    isAuthenticated: isAuthenticated
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
