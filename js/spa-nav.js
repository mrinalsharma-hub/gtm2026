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
    if (path === 'events.html' || path === 'celebrations.html' || path === 'schedule.html') return 'events.html';
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

  function ensureThemeColor() {
    var currentNorm = normalizePath(window.location.pathname);
    var themeColor = (currentNorm === 'joinus.html') ? '#B02428' : '#A71F23';
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
  }

  function updateNav(currentNorm) {
    currentNorm = currentNorm || normalizePath(window.location.pathname);
    var authed = isAuthenticated();
    var tabs = document.querySelectorAll('.fixed-bottom-nav .nav-tab');

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
  var TABS = ['G&M.html', 'events.html', 'stay.html', 'joinus.html'];

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

            // Remove existing non-preserved content from body
      var nodesToRemove = [];
      Array.from(document.body.childNodes).forEach(function(node) {
        if (node === preservedPlayer || node === preservedAudio || node === preservedNav) return;
        if (node.nodeType === 1 && (node.id === 'global-music-player' || node.id === 'bg-music' || node.classList.contains('fixed-bottom-nav'))) return;
        nodesToRemove.push(node);
      });
      nodesToRemove.forEach(function(node) { node.remove(); });

      // Insert new content nodes before the nav/player
      Array.from(newDoc.body.childNodes).forEach(function(node) {
        if (node.nodeType === 1) {
          if (node.id === 'global-music-player' || node.id === 'bg-music' || node.classList.contains('fixed-bottom-nav')) return;
        }
        var adopted = document.adoptNode(node);
        if (preservedNav && preservedNav.parentNode === document.body) {
          document.body.insertBefore(adopted, preservedNav);
        } else {
          document.body.appendChild(adopted);
        }
      });

      // Ensure preservedPlayer sits inside scrollable header on joinus or document.body
      if (preservedPlayer) {
        var targetHeroHeader = document.querySelector('.rsvp-hero-header');
        if (targetHeroHeader) {
          targetHeroHeader.appendChild(preservedPlayer);
        } else if (preservedNav && preservedNav.parentNode === document.body) {
          document.body.insertBefore(preservedPlayer, preservedNav);
        } else {
          document.body.appendChild(preservedPlayer);
        }
      }

      // 5. Update URL History
      if (pushState !== false) {
        history.pushState({ path: targetUrl }, newDoc.title, targetUrl);
      }

      // 6. Update Active Navigation Tab
      updateNav(targetNorm);

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
