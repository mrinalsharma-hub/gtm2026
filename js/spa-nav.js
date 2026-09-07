/* ── GTM2026 Seamless Universal SPA Navigation & Auth Controller ── */
(function() {
  'use strict';

  var VALID_CODES = ['gtm2026', 'mrinalgarima', 'garimamrinal'];

  function normalizePath(url) {
    if (!url) return 'index.html';
    var path = url.split('?')[0].split('#')[0].split('/').pop();
    try { path = decodeURIComponent(path); } catch(e) {}
    if (!path || path === '') {
      var currentHref = (window.location && window.location.pathname) ? window.location.pathname : '';
      if (currentHref.indexOf('G&M') !== -1 || currentHref.indexOf('gm') !== -1 || currentHref.indexOf('G%26M') !== -1) {
        return 'G&M.html';
      }
      return 'index.html';
    }
    if (path === 'index.html') return 'index.html';
    if (path === 'G&M.html' || path === 'g&m.html' || path === 'gm.html' || path === 'home.html' || path === 'us.html' || path === 'G%26M.html' || path === 'g%26m.html') {
      return 'G&M.html';
    }
    if (path === 'celebrations.html' || path === 'events.html' || path === 'schedule.html') return 'celebrations.html';
    if (path === 'travel&stay.html' || path === 'travel%26stay.html' || path === 'stay.html' || path === 'travel.html') return 'travel&stay.html';
    if (path === 'rsvp.html' || path === 'joinus.html' || path === 'rsvp2.html' || path === 'RSVP.html') return 'rsvp.html';
    return path;
  }

  function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function isAuthenticated() {
    try {
      var key = localStorage.getItem('wedding_access_key') || sessionStorage.getItem('wedding_access_key');
      if (key && VALID_CODES.indexOf(String(key).trim().toLowerCase()) !== -1) {
        return true;
      }
      var authFlag = localStorage.getItem('gtm2026_auth') || sessionStorage.getItem('gtm2026_auth') || getCookie('gtm2026_auth');
      if (authFlag === 'true' || (authFlag && VALID_CODES.indexOf(String(authFlag).trim().toLowerCase()) !== -1)) {
        return true;
      }
    } catch(e) {}
    return false;
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
    targetNorm = targetNorm || normalizePath(window.location.pathname);
    var themeColor = '#170406';

    if (targetNorm === 'index.html' || targetNorm === 'auth') {
      themeColor = '#170406'; // Exact Pure Maroon for Auth page (no white/cream patch)
    } else if (targetNorm === 'celebrations.html' || targetNorm === 'travel&stay.html' || targetNorm === 'rsvp.html' || targetNorm === 'joinus.html') {
      themeColor = '#FFEFD4'; // Cream for Celebrations, Travel, and RSVP
    } else if (targetNorm === 'G&M.html') {
      themeColor = '#471618'; // Deep Burgundy Maroon for Home (G&M)
    }

    if (document.documentElement) {
      document.documentElement.style.backgroundColor = themeColor;
    }
    if (document.body) {
      document.body.style.backgroundColor = themeColor;
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
  var TABS = ['G&M.html', 'travel&stay.html', 'celebrations.html', 'rsvp.html'];

  function getFetchUrl(norm) {
    if (norm === 'G&M.html') return 'G%26M.html';
    if (norm === 'travel&stay.html') return 'travel%26stay.html';
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
      window.location.replace('index.html');
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

      // 2. Sync any missing <link rel="stylesheet"> tags from newDoc
      var newLinks = newDoc.querySelectorAll('link[rel="stylesheet"]');
      newLinks.forEach(function(link) {
        var href = link.getAttribute('href');
        if (href && !document.head.querySelector('link[rel="stylesheet"][href="' + href + '"]')) {
          var cloneLink = document.createElement('link');
          cloneLink.setAttribute('rel', 'stylesheet');
          cloneLink.setAttribute('href', href);
          document.head.appendChild(cloneLink);
        }
      });

      // 3. Update Dynamic Page Styles
      var oldStyles = document.querySelectorAll('style[data-spa-page], #page-styles');
      oldStyles.forEach(function(s) { s.remove(); });

      var newStyles = newDoc.querySelectorAll('style');
      newStyles.forEach(function(s) {
        var cloneStyle = document.createElement('style');
        cloneStyle.setAttribute('data-spa-page', 'true');
        cloneStyle.textContent = s.textContent;
        document.head.appendChild(cloneStyle);
      });

      // 4. Update Body attributes, styling, classes & reset modal overflows
      var pageKey = 'gm';
      if (targetNorm.indexOf('stay') !== -1) pageKey = 'stay';
      else if (targetNorm.indexOf('celebrat') !== -1) pageKey = 'celebrations';
      else if (targetNorm.indexOf('rsvp') !== -1) pageKey = 'rsvp';
      else if (targetNorm === 'index.html') pageKey = 'auth';

      // Remove stale attributes that shouldn't persist
      Array.from(document.body.attributes).forEach(function(attr) {
        if (attr.name !== 'style' && !newDoc.body.hasAttribute(attr.name)) {
          document.body.removeAttribute(attr.name);
        }
      });
      // Copy all attributes from newDoc.body
      Array.from(newDoc.body.attributes).forEach(function(attr) {
        document.body.setAttribute(attr.name, attr.value);
      });
      // Explicitly set data-page attribute
      document.body.setAttribute('data-page', pageKey);
      if (pageKey === 'gm') {
        document.body.classList.add('home-page');
      } else {
        document.body.classList.remove('home-page');
        document.body.classList.add(pageKey + '-page');
      }
      document.body.style.overflow = '';
      document.body.style.position = '';

      // 5. Swap Content Nodes (Preserve audio player & bottom navigation)
      var preservedPlayer = document.getElementById('global-music-player') || document.querySelector('.celebration-player-btn');
      var preservedAudio = document.getElementById('bg-music') || window.__GTM_AUDIO__;
      var preservedNav = document.querySelector('.fixed-bottom-nav');

      // Strip incoming duplicate singleton elements only if already preserved
      if (preservedPlayer) {
        var incomingGlobalPlayers = newDoc.querySelectorAll('#global-music-player, .celebration-player-btn');
        incomingGlobalPlayers.forEach(function(el) { el.remove(); });
      }
      // Strip all incoming <audio> elements so the head singleton remains undisturbed
      var incomingAudios = newDoc.querySelectorAll('#bg-music, audio');
      incomingAudios.forEach(function(el) { el.remove(); });

      if (preservedNav) {
        var incomingNavs = newDoc.querySelectorAll('.fixed-bottom-nav');
        incomingNavs.forEach(function(el) { el.remove(); });
      }

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
          if (preservedPlayer && (node.id === 'global-music-player' || node.classList.contains('celebration-player-btn'))) return;
          if (node.id === 'bg-music' || node.tagName === 'AUDIO') return;
          if (preservedNav && node.classList.contains('fixed-bottom-nav')) return;
        }
        var adopted = document.adoptNode(node);
        if (node.id === 'global-music-player' || (node.classList && node.classList.contains('celebration-player-btn'))) {
          preservedPlayer = adopted;
        }
        if (node.classList && node.classList.contains('fixed-bottom-nav')) {
          preservedNav = adopted;
        }
        if (preservedNav && preservedNav.parentNode === document.body && adopted !== preservedNav) {
          document.body.insertBefore(adopted, preservedNav);
        } else {
          document.body.appendChild(adopted);
        }
      });

      // Ensure preservedPlayer sits cleanly as direct child of document.body
      if (preservedPlayer) {
        if (preservedNav && preservedNav.parentNode === document.body) {
          document.body.insertBefore(preservedPlayer, preservedNav);
        } else {
          document.body.appendChild(preservedPlayer);
        }
      }

      // Audio element is safely kept in head/DOM undisturbed to prevent any playback hitching
      if (preservedAudio && !preservedAudio.parentNode) {
        (document.head || document.documentElement).appendChild(preservedAudio);
      }

      // Purge any accidental duplicate player buttons
      var allLivePlayers = document.querySelectorAll('#global-music-player, .celebration-player-btn');
      if (allLivePlayers.length > 1) {
        for (var i = 1; i < allLivePlayers.length; i++) {
          allLivePlayers[i].remove();
        }
      }

      // 6. Update URL History
      if (pushState !== false) {
        history.pushState({ path: targetNorm }, newDoc.title, targetNorm);
      }

      // 7. Update Active Navigation Tab & Theme Color AT THE EXACT SAME TIME AS CONTENT UPDATE
      updateNav(targetNorm);
      ensureThemeColor(targetNorm);
      setNavHidden(false);

      // 8. Ensure audio player is bound and in sync
      if (window.GTM_AUDIO) {
        if (window.GTM_AUDIO.bindPlayer) window.GTM_AUDIO.bindPlayer();
        if (window.GTM_AUDIO.updateUI) window.GTM_AUDIO.updateUI();
      }

      // 9. Re-execute page scripts in the new content
      var scripts = document.body.querySelectorAll('script');
      scripts.forEach(function(oldScript) {
        if (oldScript.src && (oldScript.src.indexOf('spa-nav.js') !== -1 || oldScript.src.indexOf('global-audio.js') !== -1 || oldScript.src.indexOf('cms-i18n.js') !== -1)) return;
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

      // 10. Dispatch custom ready events for page scripts
      try { document.dispatchEvent(new Event('DOMContentLoaded')); } catch(e) {}
      try { window.dispatchEvent(new CustomEvent('gtm:page-loaded', { detail: { url: targetUrl, name: targetNorm } })); } catch(e) {}

      // Scroll smoothly to top of the new page container
      window.scrollTo(0, 0);
      var mainWrap = document.querySelector('.schedule-page-wrap, main, .stay-container, .rsvp-page-wrap, .celebrations-page-wrap');
      if (mainWrap) {
        mainWrap.scrollTop = 0;
      }

      // Rebind scroll listeners on newly mounted scroll containers
      bindScrollContainers();
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
      window.location.replace('index.html');
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

  // ── Auto-Hide Bottom Navigation on Scroll Controller ──
  var isNavHidden = false;

  function setNavHidden(hidden) {
    var nav = document.querySelector('.fixed-bottom-nav');
    if (!nav) return;
    nav.style.transform = '';
    nav.style.transition = '';
    nav.style.opacity = '';
    nav.style.pointerEvents = '';
    if (hidden) {
      if (!isNavHidden) {
        isNavHidden = true;
        nav.classList.add('nav-hidden');
        nav.classList.add('is-hidden');
      }
    } else {
      if (isNavHidden) {
        isNavHidden = false;
        nav.classList.remove('nav-hidden');
        nav.classList.remove('is-hidden');
      }
    }
  }

  function getScrollInfo(target) {
    if (target && typeof target.scrollTop === 'number' && target !== document && target !== window && target !== document.documentElement && target !== document.body) {
      if (target.scrollHeight > target.clientHeight) {
        return {
          elem: target,
          scrollTop: target.scrollTop,
          scrollHeight: target.scrollHeight,
          clientHeight: target.clientHeight
        };
      }
    }
    // Check if there is an active scrolling container in the page
    var pageContainer = document.querySelector('.celebrations-page-wrap, .stay-page-wrap, .rsvp-page-wrap, .schedule-page-wrap, .stay-container, main');
    if (pageContainer && pageContainer.scrollHeight > pageContainer.clientHeight && pageContainer.clientHeight > 0) {
      return {
        elem: pageContainer,
        scrollTop: pageContainer.scrollTop,
        scrollHeight: pageContainer.scrollHeight,
        clientHeight: pageContainer.clientHeight
      };
    }

    var docEl = document.documentElement;
    var body = document.body;
    var scroller = document.scrollingElement || docEl || body || window;
    var sTop = window.pageYOffset || (docEl ? docEl.scrollTop : 0) || (body ? body.scrollTop : 0) || 0;
    var sHeight = Math.max(docEl ? docEl.scrollHeight : 0, body ? body.scrollHeight : 0);
    var cHeight = window.innerHeight || (docEl ? docEl.clientHeight : 0) || 0;

    return {
      elem: scroller,
      scrollTop: sTop,
      scrollHeight: sHeight,
      clientHeight: cHeight
    };
  }

  function handleAutoScroll(e) {
    if (document.body && document.body.classList.contains('sheet-modal-open')) {
      return;
    }

    if (e && e.target && e.target.closest && (e.target.closest('.event-bottom-sheet') || e.target.closest('.event-sheet-overlay'))) {
      return;
    }

    var info = getScrollInfo(e ? e.target : null);
    if (!info) return;

    var nav = document.querySelector('.fixed-bottom-nav');
    if (!nav) return;

    var currentTop = info.scrollTop;
    var maxScroll = info.scrollHeight - info.clientHeight;
    var pullDistance = nav.offsetHeight || 64;

    if (currentTop <= 24 || maxScroll <= 0) {
      setNavHidden(false);
      return;
    }

    if (maxScroll > 0) {
      var remaining = maxScroll - currentTop;
      if (remaining <= pullDistance + 4) {
        nav.classList.remove('nav-hidden', 'is-hidden');
        isNavHidden = false;

        var pullOffset = Math.max(0, remaining);
        nav.style.transition = 'none';
        nav.style.transform = 'translate3d(0, ' + pullOffset.toFixed(1) + 'px, 0)';
        nav.style.opacity = '1';
        nav.style.pointerEvents = 'auto';
        return;
      }
    }

    setNavHidden(true);
  }

  function bindScrollContainers() {
    window.removeEventListener('scroll', handleAutoScroll, { capture: true });
    window.addEventListener('scroll', handleAutoScroll, { capture: true, passive: true });

    var scrollSelectors = [
      '.celebrations-page-wrap',
      '.stay-page-wrap',
      '.rsvp-page-wrap',
      '.schedule-page-wrap',
      '.stay-container',
      'main'
    ];
    scrollSelectors.forEach(function(sel) {
      var elems = document.querySelectorAll(sel);
      elems.forEach(function(el) {
        el.removeEventListener('scroll', handleAutoScroll);
        el.addEventListener('scroll', handleAutoScroll, { passive: true });
      });
    });
  }

  // Handle browser Back / Forward buttons
  window.addEventListener('popstate', function(e) {
    setNavHidden(false);
    loadPageSPA(window.location.pathname, false);
  });

  function init() {
    if (!checkAuthGuard()) return;
    ensureThemeColor();
    updateNav();
    prefetchAll();
    bindScrollContainers();

    window.addEventListener('focus', function() { ensureThemeColor(); setNavHidden(false); }, { passive: true });
    window.addEventListener('visibilitychange', function() { ensureThemeColor(); setNavHidden(false); }, { passive: true });
    window.addEventListener('pageshow', function() { ensureThemeColor(); setNavHidden(false); }, { passive: true });
    window.addEventListener('resize', function() { setNavHidden(false); }, { passive: true });
    window.addEventListener('orientationchange', function() { setNavHidden(false); }, { passive: true });

    var currentNorm = normalizePath(window.location.pathname);
    pageCache[currentNorm] = document.documentElement.outerHTML;
  }

  // Expose loadPageSPA and nav helpers globally
  window.GTM_SPA = {
    navigateTo: loadPageSPA,
    updateNav: updateNav,
    normalizePath: normalizePath,
    isAuthenticated: isAuthenticated,
    showNav: function() { setNavHidden(false); },
    hideNav: function() { setNavHidden(true); },
    setNavHidden: setNavHidden
  };
  window.GTM_NAV = window.GTM_SPA;
  window.loadPageSPA = loadPageSPA;

  // ── Bulletproof iOS Elastic Bounce / Rubber-Band Disabler ──
  (function initIOSBounceDisabler() {
    var touchStartY = 0;
    var activeScrollElem = null;

    window.addEventListener('touchstart', function(e) {
      if (!e.touches || e.touches.length !== 1) return;
      touchStartY = e.touches[0].clientY;

      var target = e.target;
      activeScrollElem = target ? target.closest('.celebrations-page-wrap, .stay-page-wrap, .rsvp-page-wrap, .schedule-page-wrap, .stay-container, .event-bottom-sheet, main') : null;

      if (!activeScrollElem) {
        activeScrollElem = document.scrollingElement || document.documentElement || document.body;
      }

      if (activeScrollElem && activeScrollElem.scrollHeight > activeScrollElem.clientHeight) {
        var top = activeScrollElem.scrollTop;
        var maxScroll = activeScrollElem.scrollHeight - activeScrollElem.clientHeight;

        if (top <= 0) {
          activeScrollElem.scrollTop = 1;
        } else if (top >= maxScroll) {
          activeScrollElem.scrollTop = maxScroll - 1;
        }
      }
    }, { passive: true, capture: true });

    window.addEventListener('touchmove', function(e) {
      if (!activeScrollElem || !e.touches || e.touches.length !== 1) return;
      var currentY = e.touches[0].clientY;
      var diffY = currentY - touchStartY;

      if (activeScrollElem.scrollHeight <= activeScrollElem.clientHeight) {
        e.preventDefault();
        return;
      }

      var top = activeScrollElem.scrollTop;
      var maxScroll = activeScrollElem.scrollHeight - activeScrollElem.clientHeight;

      if ((top <= 0 && diffY > 0) || (top >= maxScroll && diffY < 0)) {
        e.preventDefault();
      }
    }, { passive: false, capture: true });
  })();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
