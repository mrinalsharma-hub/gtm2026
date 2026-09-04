/* ── GTM2026 Seamless Universal SPA Navigation & Auth Controller ── */
(function() {
  'use strict';

  function normalizePath(url) {
    if (!url) return 'G&M.html';
    var path = url.split('?')[0].split('#')[0].split('/').pop();
    try { path = decodeURIComponent(path); } catch(e) {}
    if (!path || path === '' || path === 'index.html' || path === 'G&M.html' || path === 'g&m.html' || path === 'gm.html' || path === 'home.html' || path === 'us.html' || path === 'G%26M.html' || path === 'g%26m.html') {
      return 'G&M.html';
    }
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
    return true;
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

  setPersistentAuth();

  function checkAuthGuard() {
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
    var tabs = document.querySelectorAll('.fixed-bottom-nav .nav-tab');

    tabs.forEach(function(tab) {
      var href = tab.getAttribute('href');
      var tabNorm = normalizePath(href);

      if (tabNorm === currentNorm) {
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
      tab.classList.remove('is-locked');
    });
  }

  // Pre-fetch tabs into memory cache with normalized keys
  var pageCache = {};
  var TABS = ['G&M.html', 'stay.html', 'celebrations.html', 'joinus.html'];

  function getFetchUrl(norm) {
    if (norm === 'G&M.html') return 'G%26M.html';
    return norm;
  }

  function prefetchPage(url) {
    var norm = normalizePath(url);
    if (!norm || pageCache[norm]) return;
    var fetchUrl = getFetchUrl(norm);
    fetch(fetchUrl + (fetchUrl.indexOf('?') !== -1 ? '&' : '?') + '_spa=' + Date.now())
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

    // If already on the same page and not popstate, just sync nav, scroll and return
    if (targetNorm === currentNorm && pushState !== false) {
      updateNav(targetNorm);
      ensureThemeColor(targetNorm);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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
      document.body.style.position = '';

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

      // 6. Update Active Navigation Tab & Theme Color AT THE EXACT SAME TIME AS CONTENT UPDATE
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
        try {
          var newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(function(attr) {
            newScript.setAttribute(attr.name, attr.value);
          });
          if (oldScript.innerHTML) {
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          }
          oldScript.parentNode.replaceChild(newScript, oldScript);
        } catch(e) {
          console.warn('SPA script execution warning:', e);
        }
      });

      // 9. Dispatch custom ready events for page scripts
      try { document.dispatchEvent(new Event('DOMContentLoaded')); } catch(e) {}
      try { window.dispatchEvent(new CustomEvent('gtm:page-loaded', { detail: { url: targetUrl, name: targetNorm } })); } catch(e) {}

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
    var fetchUrl = getFetchUrl(targetNorm);

    fetch(fetchUrl + (fetchUrl.indexOf('?') !== -1 ? '&' : '?') + '_spa=' + Date.now(), {
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
        window.location.href = fetchUrl;
      });
  }

  // ── Bulletproof iOS & Android Touch Navigation Handler ──
  var touchStartX = 0;
  var touchStartY = 0;
  var touchStartTime = 0;
  var touchTargetLink = null;
  var lastHandledTime = 0;

  function executeLinkNavigation(link, e) {
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    if (link.target === '_blank') return;
    if (link.classList.contains('no-spa')) return;

    var targetNorm = normalizePath(href);

    // If unauthenticated and clicking a locked tab
    if (!isAuthenticated() && targetNorm !== 'index.html') {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (window.handleOpenDetails) {
        window.handleOpenDetails(e);
      } else {
        window.location.href = 'index.html';
      }
      return;
    }

    if (e) {
      try { e.preventDefault(); e.stopPropagation(); } catch(err) {}
    }
    lastHandledTime = Date.now();
    loadPageSPA(href, true);
  }

  // 1. Touchstart: record start point without mutating DOM (prevents iOS WebKit tap gesture cancellation)
  document.addEventListener('touchstart', function(e) {
    var link = e.target.closest('a');
    if (!link) {
      touchTargetLink = null;
      return;
    }
    var touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    touchTargetLink = link;
  }, { capture: true, passive: true });

  // 2. Touchend: execute instant navigation if finger didn't move significantly (genuine tap on iOS)
  document.addEventListener('touchend', function(e) {
    if (!touchTargetLink) return;
    var touch = e.changedTouches[0];
    if (!touch) return;
    var dx = Math.abs(touch.clientX - touchStartX);
    var dy = Math.abs(touch.clientY - touchStartY);
    var dt = Date.now() - touchStartTime;

    // If tap was clean (<12px drift, <600ms duration)
    if (dx < 12 && dy < 12 && dt < 600) {
      var link = touchTargetLink;
      touchTargetLink = null;
      executeLinkNavigation(link, e);
    } else {
      touchTargetLink = null;
    }
  }, { capture: true, passive: false });

  document.addEventListener('touchcancel', function() {
    touchTargetLink = null;
  }, { capture: true, passive: true });

  // 3. Click handler: fallback for mouse / keyboard / non-touch clicks (debounced after touchend)
  document.addEventListener('click', function(e) {
    // If this click was already triggered and processed by touchend in the last 400ms, prevent duplicate processing
    if (Date.now() - lastHandledTime < 400) {
      var handledLink = e.target.closest('a');
      if (handledLink && !handledLink.classList.contains('no-spa')) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    var link = e.target.closest('a');
    if (!link) return;
    executeLinkNavigation(link, e);
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
