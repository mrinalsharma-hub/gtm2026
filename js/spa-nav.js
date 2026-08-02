/* ── GTM2026 Seamless Native App Tab Navigation (SPA Router) ── */
(function() {
  'use strict';

  var PAGE_CACHE = {};
  var isTransitioning = false;

  function normalizePath(url) {
    if (!url) return 'gm.html';
    var path = url.split('?')[0].split('#')[0].split('/').pop();
    if (!path || path === '' || path === 'index.html' || path === 'us.html' || path === 'home.html') return 'gm.html';
    if (path === 'events.html' || path === 'schedule.html') return 'celebrations.html';
    if (path === 'travel.html') return 'stay.html';
    if (path === 'rsvp.html' || path === 'rsvp2.html') return 'joinus.html';
    return path;
  }

  function isPermanentElement(el) {
    if (!el || !el.classList) return false;
    return el.classList.contains('fixed-bottom-nav') ||
           el.classList.contains('top-status-sampler') ||
           el.classList.contains('bottom-status-sampler') ||
           el.tagName === 'SCRIPT' ||
           el.id === 'spa-content-host' ||
           el.id === 'wedding-gateway';
  }

  function parseAndCache(pageKey, htmlString) {
    if (!htmlString) return;
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(htmlString, 'text/html');
      var title = doc.title || 'GTM 2026';
      
      // Extract in-page styles if any
      var styles = Array.from(doc.head.querySelectorAll('style')).map(function(s) { return s.outerHTML; }).join('\n');

      // Extract everything in body except permanent elements (nav, samplers, scripts)
      var bodyChildren = Array.from(doc.body.children).filter(function(el) {
        return !isPermanentElement(el);
      });

      if (bodyChildren.length > 0) {
        PAGE_CACHE[pageKey] = {
          title: title,
          bodyHtml: (styles ? styles + '\n' : '') + bodyChildren.map(function(el) { return el.outerHTML; }).join('\n'),
          html: htmlString
        };
      }
    } catch(e) {}
  }

  // Pre-fetch all pages on startup
  var TABS = ['gm.html', 'celebrations.html', 'stay.html', 'joinus.html'];
  function prefetchPages() {
    TABS.forEach(function(page) {
      fetch(page)
        .then(function(res) { return res.text(); })
        .then(function(html) {
          parseAndCache(page, html);
        })
        .catch(function() {});
    });
  }

  // Cache current page immediately from DOM
  var currentNorm = normalizePath(window.location.pathname);
  var currentNonNav = Array.from(document.body.children).filter(function(el) {
    return !isPermanentElement(el);
  });
  if (currentNonNav.length > 0) {
    var curStyles = Array.from(document.head.querySelectorAll('style')).map(function(s) { return s.outerHTML; }).join('\n');
    PAGE_CACHE[currentNorm] = {
      title: document.title,
      bodyHtml: (curStyles ? curStyles + '\n' : '') + currentNonNav.map(function(el) { return el.outerHTML; }).join('\n'),
      html: document.documentElement.outerHTML
    };
  }

  // Start prefetching
  prefetchPages();

  // Update navbar active state
  function updateNav(targetNorm) {
    var tabs = document.querySelectorAll('.fixed-bottom-nav .nav-tab');
    tabs.forEach(function(tab) {
      var href = tab.getAttribute('href');
      var tabNorm = normalizePath(href);
      if (tabNorm === targetNorm) {
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

  function initPageScripts() {
    // 1. Re-init Scroll Clamping on the active scroller
    var scroller = document.querySelector('main, .schedule-page-wrap, .us-page-wrap, .rsvp-page-wrap');
    if (scroller) {
      scroller.scrollTop = 0;
      scroller.addEventListener('touchstart', function() {
        var top = scroller.scrollTop;
        var totalScroll = scroller.scrollHeight;
        var currentScroll = top + scroller.offsetHeight;
        if (top <= 0) {
          scroller.scrollTop = 1;
        } else if (currentScroll >= totalScroll) {
          scroller.scrollTop = top - 1;
        }
      }, { passive: true });
    }

    // 2. Re-init RSVP Form if present
    var rsvpForm = document.getElementById('rsvp-form');
    if (rsvpForm) {
      initRsvpForm();
    }

    // 3. Re-init Music player if present
    var musicBtn = document.getElementById('music-toggle') || document.querySelector('.music-toggle-btn');
    var audio = document.getElementById('bg-audio');
    if (musicBtn && audio) {
      initMusicBtn(musicBtn, audio);
    }
  }

  function initMusicBtn(btn, audio) {
    var playIcon = btn.querySelector('.icon-play');
    var pauseIcon = btn.querySelector('.icon-pause');
    btn.onclick = function(e) {
      e.preventDefault();
      if (audio.paused) {
        audio.play().then(function() {
          if (playIcon) playIcon.style.display = 'none';
          if (pauseIcon) pauseIcon.style.display = 'block';
          btn.classList.add('is-playing');
        }).catch(function() {});
      } else {
        audio.pause();
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';
        btn.classList.remove('is-playing');
      }
    };
  }

  function initRsvpForm() {
    var form = document.getElementById('rsvp-form'),
        status = document.getElementById('rsvp-status'),
        thanks = document.getElementById('rsvp-thanks'),
        list = document.getElementById('name-list'),
        addBtn = document.getElementById('add-person'),
        MAX_NAMES = 8;

    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';

    var RSVP_CONFIG = {
      formId: "1FAIpQLSfeO8PSZsK5uh-BZzMEa5SIlpMaKwp1fx9R5dhrdmgSYiibVg",
      entries: {
        name: "entry.874918285",
        contact: "entry.2141331214",
        attending: "entry.1260390804",
        guests: "entry.530695183",
        events: "entry.1296232095",
        dietary: "entry.154148020",
        message: "entry.1246319647"
      }
    };

    if (addBtn && list) {
      addBtn.onclick = function() {
        var count = list.querySelectorAll('.name-input').length;
        if (count >= MAX_NAMES) return;
        var row = document.createElement('div');
        row.className = 'name-row';
        row.innerHTML = '<input type="text" class="finput name-input" placeholder="Please enter their full name">' +
                        '<button type="button" class="rm" aria-label="Remove this person">&#10005;</button>';
        list.appendChild(row);
        row.querySelector('.rm').onclick = function() { row.remove(); };
        row.querySelector('input').focus();
        if (list.querySelectorAll('.name-input').length >= MAX_NAMES) addBtn.style.display = 'none';
      };
      list.onclick = function() {
        if (list.querySelectorAll('.name-input').length < MAX_NAMES) addBtn.style.display = '';
      };
    }

    form.onsubmit = function(e) {
      e.preventDefault();
      var names = [].slice.call(form.querySelectorAll('.name-input'))
                    .map(function(i) { return i.value.trim(); })
                    .filter(Boolean),
          contact = form.querySelector('#f-contact') ? form.querySelector('#f-contact').value.trim() : '',
          attending = form.querySelector('input[name=attending]:checked');

      if (!names.length || !contact || !attending) {
        if (status) status.textContent = 'Please fill in your name, contact and whether you can join us.';
        return;
      }
      var p = new URLSearchParams();
      p.append(RSVP_CONFIG.entries.name, names.join(', '));
      p.append(RSVP_CONFIG.entries.contact, contact);
      p.append(RSVP_CONFIG.entries.attending, attending.value);
      p.append(RSVP_CONFIG.entries.guests, String(names.length));
      form.querySelectorAll('input[name=events]:checked').forEach(function(c) {
        p.append(RSVP_CONFIG.entries.events, c.value);
      });
      var dietEl = form.querySelector('#f-diet'),
          msgEl = form.querySelector('#f-msg');
      var diet = dietEl ? dietEl.value.trim() : '',
          msg = msgEl ? msgEl.value.trim() : '';
      if (diet) p.append(RSVP_CONFIG.entries.dietary, diet);
      if (msg) p.append(RSVP_CONFIG.entries.message, msg);

      if (status) status.textContent = 'Sending…';
      fetch('https://docs.google.com/forms/d/e/' + RSVP_CONFIG.formId + '/formResponse', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: p.toString()
      }).then(function() {
        form.style.display = 'none';
        if (thanks) thanks.style.display = 'block';
        var scroller = document.querySelector('main');
        if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
      }).catch(function() {
        if (status) status.textContent = 'Something went wrong — please try again, or write to us directly.';
      });
    };
  }

  function ensureSamplers() {
    if (!document.querySelector('.top-status-sampler')) {
      var topSampler = document.createElement('div');
      topSampler.className = 'top-status-sampler';
      topSampler.setAttribute('aria-hidden', 'true');
      document.body.prepend(topSampler);
    }
    if (!document.querySelector('.bottom-status-sampler')) {
      var bottomSampler = document.createElement('div');
      bottomSampler.className = 'bottom-status-sampler';
      bottomSampler.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bottomSampler);
    }
  }

  function getHost() {
    ensureSamplers();
    var host = document.getElementById('spa-content-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'spa-content-host';
      host.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;background-color:#981C1E;background:radial-gradient(ellipse 120% 70% at 50% 0%, #981C1E 0%, #881818 35%, #701210 65%, #620E0B 100%);overflow:hidden;transition:opacity 0.15s ease;scrollbar-width:none;-ms-overflow-style:none;';
      
      var nonNavElements = Array.from(document.body.children).filter(function(el) {
        return !isPermanentElement(el);
      });
      
      nonNavElements.forEach(function(el) {
        host.appendChild(el);
      });
      
      var nav = document.querySelector('.fixed-bottom-nav');
      if (nav) {
        document.body.insertBefore(host, nav);
      } else {
        document.body.appendChild(host);
      }
    }
    return host;
  }

  function renderPage(pageData, targetNorm, targetUrl, updateHistory) {
    if (!pageData || !pageData.bodyHtml) {
      window.location.href = targetUrl;
      return;
    }

    document.title = pageData.title;
    var host = getHost();

    // Smooth subtle fade out
    host.style.opacity = '0';

    setTimeout(function() {
      host.innerHTML = pageData.bodyHtml;
      
      if (updateHistory) {
        history.pushState({ path: targetNorm }, '', targetUrl);
      }

      initPageScripts();

      requestAnimationFrame(function() {
        host.style.opacity = '1';
        isTransitioning = false;
      });
    }, 70);
  }

  function navigateTo(url, updateHistory) {
    var targetNorm = normalizePath(url);
    var currentNorm = normalizePath(window.location.pathname);

    if (targetNorm === currentNorm && updateHistory) return;
    if (isTransitioning) return;
    isTransitioning = true;

    // Safety timeout
    setTimeout(function() { isTransitioning = false; }, 600);

    // 1. Instantly transition typography/icon color in bottom nav
    updateNav(targetNorm);

    // 2. Fetch or load from cache
    if (PAGE_CACHE[targetNorm] && PAGE_CACHE[targetNorm].bodyHtml) {
      renderPage(PAGE_CACHE[targetNorm], targetNorm, url, updateHistory);
    } else {
      fetch(targetNorm)
        .then(function(res) { return res.text(); })
        .then(function(html) {
          parseAndCache(targetNorm, html);
          if (PAGE_CACHE[targetNorm] && PAGE_CACHE[targetNorm].bodyHtml) {
            renderPage(PAGE_CACHE[targetNorm], targetNorm, url, updateHistory);
          } else {
            isTransitioning = false;
            window.location.href = url;
          }
        })
        .catch(function() {
          isTransitioning = false;
          window.location.href = url;
        });
    }
  }

  // Intercept bottom nav clicks
  document.addEventListener('click', function(e) {
    var tab = e.target.closest('.fixed-bottom-nav a.nav-tab');
    if (!tab) return;
    var href = tab.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://')) return;

    e.preventDefault();
    navigateTo(href, true);
  });

  // Handle back/forward buttons
  window.addEventListener('popstate', function() {
    navigateTo(window.location.pathname, false);
  });

  // Initial init
  initPageScripts();
})();
