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

  function ensureThemeColor(targetNorm) {
    var themeColor = '#FFEFD4';

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

    tabs.forEach(function(tab) {
      var href = tab.getAttribute('href');
      var tabNorm = normalizePath(href);

      if (tabNorm === currentNorm && (authed || currentNorm !== 'index.html')) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        var label = tab.querySelector('.nav-label');
        var text = label ? label.textContent.trim() : '';
        tab.setAttribute('aria-label', text + ' (Current Page)');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
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

  // Pre-fetch tabs into memory cache with normalized keys
  var pageCache = {};
  var TABS = ['G&M.html', 'stay.html', 'celebrations.html', 'joinus.html'];

  function prefetchPage(url) {
    var norm = normalizePath(url);
    if (!norm || pageCache[norm]) return;
    fetch(norm + (norm.indexOf('?') !== -1 ? '&' : '?') + '_spa=' + Date.now())
      .then(function(res) { if (res.ok) return res.text(); })
      .then(function(html) { if (html) pageCache[norm] = html; })
      .catch(function() {});
  }

  function prefetchAll() {
    if (!isAuthenticated()) return;
    TABS.forEach(prefetchPage);
  }

  // ── Robust Concurrent SPA Navigation Controller with NavId Sequencing ──
  var currentNavId = 0;
  var activeAbortController = null;

  function loadPageSPA(targetUrl, pushState) {
    var targetNorm = normalizePath(targetUrl);
    var currentNorm = normalizePath(window.location.pathname);

    // If unauthenticated and trying to go to protected pages
    if (targetNorm !== 'index.html' && !isAuthenticated()) {
      if (window.handleOpenDetails) {
        window.handleOpenDetails();
      } else {
        window.location.href = 'index.html';
      }
      return;
    }

    // Sequence token: every new navigation increments the ID so older in-flight transitions are discarded
    currentNavId++;
    var thisNavId = currentNavId;

    // Abort any in-flight network request from prior navigation
    if (activeAbortController) {
      try { activeAbortController.abort(); } catch(e) {}
      activeAbortController = null;
    }

    // Instant Visual Feedback: lock active tab highlight and theme-color immediately to the latest tapped tab
    updateNav(targetNorm);
    ensureThemeColor(targetNorm);

    // If already on the same page and not popstate, no-op
    if (targetNorm === currentNorm && pushState !== false) return;

    function applyHTML(html) {
      // Discard stale transitions if a newer navigation was initiated
      if (thisNavId !== currentNavId) return;

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

      // 3. Update Body styling / classes & reset modal overflows
      document.body.className = newDoc.body.className;
      document.body.style.overflow = '';

      // 4. Swap Content Nodes (Preserve audio player & bottom navigation)
      var preservedPlayer = document.getElementById('global-music-player');
      var preservedAudio = document.getElementById('bg-music') || window.__GTM_AUDIO__;
      var preservedNav = document.querySelector('.fixed-bottom-nav');

      // Strip duplicate audio player or nav elements from incoming document before adoption
      var incomingPlayers = newDoc.querySelectorAll('#global-music-player, #music-toggle, .celebration-player-btn, .global-audio-pill');
      incomingPlayers.forEach(function(el) { el.remove(); });
      var incomingAudios = newDoc.querySelectorAll('#bg-music, audio');
      incomingAudios.forEach(function(el) { el.remove(); });
      var incomingNavs = newDoc.querySelectorAll('.fixed-bottom-nav');
      incomingNavs.forEach(function(el) { el.remove(); });

      // Remove existing non-preserved content nodes from body
      var nodesToRemove = [];
      Array.from(document.body.childNodes).forEach(function(node) {
        if (node === preservedPlayer || node === preservedAudio || node === preservedNav) return;
        if (node.nodeType === 1 && (node.id === 'global-music-player' || node.id === 'bg-music' || node.classList.contains('fixed-bottom-nav') || node.classList.contains('celebration-player-btn'))) return;
        nodesToRemove.push(node);
      });
      nodesToRemove.forEach(function(node) { node.remove(); });

      // Insert new content nodes before the bottom navigation
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

      // Purge any accidental duplicate player buttons
      var allLivePlayers = document.querySelectorAll('#global-music-player, .celebration-player-btn');
      if (allLivePlayers.length > 1) {
        for (var i = 1; i < allLivePlayers.length; i++) {
          allLivePlayers[i].remove();
        }
      }

      // 5. Update URL History
      if (pushState !== false) {
        history.pushState({ path: targetNorm }, newDoc.title, targetNorm);
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

      // 9. Dispatch custom ready events for page scripts
      document.dispatchEvent(new Event('DOMContentLoaded'));
      window.dispatchEvent(new CustomEvent('gtm:page-loaded', { detail: { url: targetUrl, name: targetNorm } }));

      // Scroll smoothly to top of the new page container
      window.scrollTo(0, 0);
      var mainWrap = document.querySelector('.schedule-page-wrap, main, .stay-container, .rsvp-page-wrap, .celebrations-page-wrap');
      if (mainWrap) {
        mainWrap.scrollTop = 0;
      }
    }

    // Check memory cache first (instant 0ms synchronous transition)
    var cached = pageCache[targetNorm];
    if (cached) {
      applyHTML(cached);
      return;
    }

    // Otherwise fetch with AbortController
    var controller = new AbortController();
    activeAbortController = controller;

    fetch(targetNorm + (targetNorm.indexOf('?') !== -1 ? '&' : '?') + '_spa=' + Date.now(), {
      signal: controller.signal
    })
      .then(function(res) {
        if (!res.ok) throw new Error('Page fetch failed');
        return res.text();
      })
      .then(function(html) {
        pageCache[targetNorm] = html;
        if (thisNavId === currentNavId) {
          applyHTML(html);
        }
      })
      .catch(function(err) {
        if (err.name === 'AbortError') return; // Superseded by a newer navigation
        if (thisNavId !== currentNavId) return;
        console.error('SPA navigation fallback to full load:', err);
        window.location.href = targetNorm;
      });
  }

  // Instant Tap / Touchdown Theme Trigger
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
  document.addEventListener('mousedown', onNavTouchStart, { capture: true, passive: true });

  // Intercept all internal navigation clicks globally
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    if (link.target === '_blank') return;
    if (link.classList.contains('no-spa')) return;

    var targetNorm = normalizePath(href);

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

    // Cache the initial page HTML with normalized key
    var currentNorm = normalizePath(window.location.pathname);
    pageCache[currentNorm] = document.documentElement.outerHTML;
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
