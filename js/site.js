/* ═══════════════════════════════════════════════════════
   Garima weds Mrinal · Shared Behaviour & Auth Gateway
   ═══════════════════════════════════════════════════════ */

(function(){
  'use strict';

  /* ── 1. WEDDING VERSIONS & PASSCODES ─────────────────── */
  var WEDDING_VERSIONS = {
    'gtm2026': {
      id: 'gtm2026',
      canonicalKey: 'GTM2026',
      name1: 'GARIMA',
      name2: 'MRINAL',
      title: 'Celebration Hub',
      badgeText: 'Celebration Hub (GTM 2026)',
      pageTitle: 'Garima weds Mrinal — 20–22 November 2026, Nainital',
      desc: 'Full celebration itinerary, RSVP, and travel details.'
    },
    'mrinalgarima': {
      id: 'mrinalgarima',
      canonicalKey: 'MRINALGARIMA',
      name1: 'MRINAL',
      name2: 'GARIMA',
      title: "Groom's Family & Friends Edition",
      badgeText: "Groom's Family & Friends",
      pageTitle: 'Mrinal weds Garima — 20–22 November 2026, Nainital',
      desc: "Personalized edition for Mrinal's family and guests."
    },
    'garimamrinal': {
      id: 'garimamrinal',
      canonicalKey: 'GARIMAMRINAL',
      name1: 'GARIMA',
      name2: 'MRINAL',
      title: "Bride's Family & Friends Edition",
      badgeText: "Bride's Family & Friends",
      pageTitle: 'Garima weds Mrinal — 20–22 November 2026, Nainital',
      desc: "Personalized edition for Garima's family and guests."
    }
  };

  var STORAGE_KEY = 'wedding_access_key';

  function normalizeCode(str) {
    if (!str) return '';
    return String(str).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function getVersionConfig(rawCode) {
    var norm = normalizeCode(rawCode);
    return WEDDING_VERSIONS[norm] || null;
  }

  /* ── 2. SMART AUTO-DETECTION ────────────────────────── */
  function detectAutoKey() {
    // A. URL query parameter: ?key=..., ?passcode=..., ?code=..., ?v=...
    try {
      var params = new URLSearchParams(window.location.search);
      var queryKey = params.get('key') || params.get('passcode') || params.get('code') || params.get('v') || params.get('access_key');
      if (queryKey && getVersionConfig(queryKey)) {
        return normalizeCode(queryKey);
      }
    } catch (e) {}

    // B. Direct domain / hostname auto-detection
    var host = (window.location.hostname || '').toLowerCase();
    if (host.indexOf('mrinalgarima') !== -1) return 'mrinalgarima';
    if (host.indexOf('garimamrinal') !== -1) return 'garimamrinal';
    if (host.indexOf('gtm2026') !== -1) return 'gtm2026';

    // C. Pathname auto-detection
    var path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('/mrinalgarima') !== -1) return 'mrinalgarima';
    if (path.indexOf('/garimamrinal') !== -1) return 'garimamrinal';

    return null;
  }

  /* ── 3. DOM INJECTION FOR MODAL & NAV PILLS ──────────── */
  function ensureGatewayDOM() {
    // Inject overlay if not present on current page
    if (!document.getElementById('wedding-gateway')) {
      var overlayDiv = document.createElement('div');
      overlayDiv.id = 'wedding-gateway';
      overlayDiv.className = 'wedding-gateway-overlay';
      overlayDiv.setAttribute('aria-modal', 'true');
      overlayDiv.setAttribute('role', 'dialog');
      overlayDiv.setAttribute('aria-labelledby', 'gateway-title');
      overlayDiv.innerHTML =
        '<svg class="gateway-bgmandala" viewBox="0 0 440 440" aria-hidden="true">' +
          '<circle class="fill" cx="220" cy="220" r="7"/>' +
          '<circle cx="220" cy="220" r="26"/>' +
          '<g>' +
            '<path d="M220,184 C207,167 207,145 220,128 C233,145 233,167 220,184 Z"/>' +
            '<path d="M220,184 C207,167 207,145 220,128 C233,145 233,167 220,184 Z" transform="rotate(45 220 220)"/>' +
            '<path d="M220,184 C207,167 207,145 220,128 C233,145 233,167 220,184 Z" transform="rotate(90 220 220)"/>' +
            '<path d="M220,184 C207,167 207,145 220,128 C233,145 233,167 220,184 Z" transform="rotate(135 220 220)"/>' +
            '<path d="M220,184 C207,167 207,145 220,128 C233,145 233,167 220,184 Z" transform="rotate(180 220 220)"/>' +
            '<path d="M220,184 C207,167 207,145 220,128 C233,145 233,167 220,184 Z" transform="rotate(225 220 220)"/>' +
            '<path d="M220,184 C207,167 207,145 220,128 C233,145 233,167 220,184 Z" transform="rotate(270 220 220)"/>' +
            '<path d="M220,184 C207,167 207,145 220,128 C233,145 233,167 220,184 Z" transform="rotate(315 220 220)"/>' +
          '</g>' +
          '<circle cx="220" cy="220" r="100"/>' +
          '<circle cx="220" cy="220" r="168"/>' +
        '</svg>' +
        '<div class="gateway-modal-card" id="gateway-card">' +
          '<button class="gateway-close-btn" id="gateway-close-btn" aria-label="Close Gateway" title="Close" style="display:none;">✕</button>' +
          '<p class="gateway-shloka">॥ श्री गणेशाय नमः ॥</p>' +
          '<div class="gateway-diya-wrap">' +
            '<svg class="gateway-diya-svg" viewBox="0 0 80 80" aria-hidden="true">' +
              '<defs>' +
                '<radialGradient id="diyaFlameGlow" cx="50%" cy="50%" r="50%">' +
                  '<stop offset="0%" stop-color="#FFDF85" stop-opacity="1"/>' +
                  '<stop offset="60%" stop-color="#EAA838" stop-opacity="0.8"/>' +
                  '<stop offset="100%" stop-color="#A71F23" stop-opacity="0"/>' +
                '</radialGradient>' +
              '</defs>' +
              '<circle cx="40" cy="22" r="18" fill="url(#diyaFlameGlow)" class="flame-aura"/>' +
              '<path d="M40,10 C44,18 48,25 44,32 C42,35 38,35 36,32 C32,25 36,18 40,10 Z" fill="#FFDF85" stroke="#BA8C48" stroke-width="1"/>' +
              '<path d="M40,16 C41.5,20 43,24 41.5,28 C40.5,29.5 39.5,29.5 38.5,28 C37,24 38.5,20 40,16 Z" fill="#FFFFFF"/>' +
              '<path d="M16,42 Q40,64 64,42 L58,38 Q40,48 22,38 Z" fill="#BA8C48" stroke="#96181C" stroke-width="1.2"/>' +
              '<path d="M22,38 Q40,48 58,38" fill="none" stroke="#FFF6E8" stroke-width="1.5"/>' +
              '<path d="M30,52 Q40,62 50,52" fill="none" stroke="#7E1216" stroke-width="1.2"/>' +
              '<circle cx="40" cy="56" r="3" fill="#BA8C48"/>' +
            '</svg>' +
          '</div>' +
          '<p class="gateway-eyebrow">Private Wedding Gateway</p>' +
          '<h2 class="gateway-title" id="gateway-title">GARIMA &amp; MRINAL</h2>' +
          '<p class="gateway-date">20–22 November 2026 · Nainital, Uttarakhand</p>' +
          '<div class="gateway-divider" aria-hidden="true">' +
            '<span class="gateway-line"></span>' +
            '<span class="gateway-gem">✦</span>' +
            '<span class="gateway-line"></span>' +
          '</div>' +
          '<p class="gateway-prompt" id="gateway-prompt-text">' +
            'Please enter your wedding invitation passcode to unlock our celebration schedule, travel guide, and RSVP.' +
          '</p>' +
          '<form class="gateway-form" id="gateway-form" onsubmit="return false;" autocomplete="off">' +
            '<div class="gateway-input-wrap">' +
              '<span class="gateway-key-icon" aria-hidden="true">🗝️</span>' +
              '<input type="text" id="gateway-passcode-input" class="gateway-input" placeholder="ENTER PASSCODE" aria-label="Wedding invitation passcode" maxlength="24" autocapitalize="characters" autocorrect="off" spellcheck="false" required>' +
            '</div>' +
            '<div class="gateway-error" id="gateway-error-msg" role="alert" aria-live="polite"></div>' +
            '<button type="submit" id="gateway-submit-btn" class="gateway-btn-unlock">' +
              '<span class="btn-text">Unlock Invitation</span>' +
              '<span class="btn-arrow">→</span>' +
            '</button>' +
          '</form>' +
        '</div>';
      document.body.appendChild(overlayDiv);
    }
  }

  /* ── 4. VERSION PERSONALIZATION APPLIER ─────────────── */
  function applyWeddingVersion(versionId) {
    var v = WEDDING_VERSIONS[versionId];
    if (!v) return;

    document.body.dataset.weddingVersion = v.id;

    // Update pill labels
    var pillLabel = document.getElementById('gateway-pill-label');
    if (pillLabel) pillLabel.textContent = v.canonicalKey;

    var menuPill = document.getElementById('menu-pill-key');
    if (menuPill) menuPill.textContent = v.canonicalKey;

    // Update index.html hero names & title if applicable
    var heroName1 = document.getElementById('hero-name-1');
    var heroName2 = document.getElementById('hero-name-2');
    if (heroName1 && heroName2) {
      heroName1.textContent = v.name1;
      heroName2.textContent = v.name2;
    }
    if (document.title && document.title.indexOf('20–22 November 2026') !== -1) {
      document.title = v.pageTitle;
    }

    // Update guest badge if available
    var guestBadge = document.getElementById('hero-guest-badge');
    if (guestBadge) {
      guestBadge.textContent = v.badgeText;
      guestBadge.style.display = 'inline-flex';
    }

    // Update modal active status text
    var currentKeyName = document.getElementById('gateway-current-key-name');
    if (currentKeyName) {
      currentKeyName.textContent = v.canonicalKey + ' · ' + v.title;
    }
  }

  /* ── 5. GATEWAY MODAL CONTROLLER ─────────────────────── */
  function initGateway() {
    ensureGatewayDOM();

    var overlay = document.getElementById('wedding-gateway'),
        card = document.getElementById('gateway-card'),
        form = document.getElementById('gateway-form'),
        input = document.getElementById('gateway-passcode-input'),
        errorMsg = document.getElementById('gateway-error-msg'),
        submitBtn = document.getElementById('gateway-submit-btn'),
        closeBtn = document.getElementById('gateway-close-btn'),
        logoutBtn = document.getElementById('gateway-logout-btn'),
        activeStatus = document.getElementById('gateway-active-status'),
        promptText = document.getElementById('gateway-prompt-text'),
        pillBtn = document.getElementById('gateway-key-pill'),
        menuSwitchKey = document.getElementById('menu-switch-key');

    function showError(msg) {
      if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.classList.add('visible');
      }
      if (input) input.classList.add('error');
      if (card) {
        card.classList.remove('gateway-shake');
        // Trigger reflow to restart shake animation
        void card.offsetWidth;
        card.classList.add('gateway-shake');
        setTimeout(function(){ card.classList.remove('gateway-shake'); }, 600);
      }
      if (input) input.focus();
    }

    function clearError() {
      if (errorMsg) {
        errorMsg.textContent = '';
        errorMsg.classList.remove('visible');
      }
      if (input) input.classList.remove('error');
    }

    function openGateway(isSwitchMode) {
      var saved = normalizeCode(localStorage.getItem(STORAGE_KEY));
      var isAuth = Boolean(saved && WEDDING_VERSIONS[saved]);

      clearError();
      if (input) {
        input.value = '';
      }

      if (isSwitchMode && isAuth) {
        if (closeBtn) closeBtn.style.display = 'flex';
        if (activeStatus) activeStatus.style.display = 'block';
        if (promptText) {
          promptText.textContent = 'Switch your invitation key to view a different guest edition:';
        }
      } else {
        if (closeBtn) closeBtn.style.display = 'none';
        if (activeStatus) activeStatus.style.display = 'none';
        if (promptText) {
          promptText.textContent = 'Please enter your wedding invitation passcode to unlock our celebration schedule, travel guide, and RSVP.';
        }
      }

      if (overlay) overlay.classList.add('active');
      document.body.classList.add('gateway-locked');
      setTimeout(function(){ if (input) input.focus(); }, 350);
    }

    function closeGateway() {
      var saved = normalizeCode(localStorage.getItem(STORAGE_KEY));
      if (!saved || !WEDDING_VERSIONS[saved]) {
        showError('Please enter a valid passcode to view the wedding details.');
        return;
      }
      if (overlay) overlay.classList.remove('active');
      document.body.classList.remove('gateway-locked');
      clearError();
    }

    function handleUnlock(versionId) {
      var v = WEDDING_VERSIONS[versionId];
      if (!v) return;

      localStorage.setItem(STORAGE_KEY, v.id);
      applyWeddingVersion(v.id);
      clearError();

      if (submitBtn) {
        submitBtn.innerHTML = '<span class="btn-text">Invitation Unlocked 🪔</span>';
      }

      if (overlay) {
        overlay.classList.add('unlocking');
        setTimeout(function(){
          overlay.classList.remove('active');
          overlay.classList.remove('unlocking');
          document.body.classList.remove('gateway-locked');
          if (submitBtn) {
            submitBtn.innerHTML = '<span class="btn-text">Unlock Invitation</span><span class="btn-arrow">→</span>';
          }
        }, 550);
      } else {
        document.body.classList.remove('gateway-locked');
      }
    }

    function submitPasscode() {
      var raw = input ? input.value : '';
      var norm = normalizeCode(raw);

      if (!norm) {
        showError('Please enter your wedding invitation passcode.');
        return;
      }

      if (WEDDING_VERSIONS[norm]) {
        handleUnlock(norm);
      } else {
        showError('Invalid invitation passcode. Please check your card (e.g. GTM2026).');
      }
    }

    // Form submit listener
    if (form) {
      form.addEventListener('submit', function(e){
        e.preventDefault();
        submitPasscode();
      });
    }

    // Input typing listener to clear error
    if (input) {
      input.addEventListener('input', function(){
        if (input.classList.contains('error')) clearError();
      });
    }

    // Close button listener
    if (closeBtn) {
      closeBtn.addEventListener('click', closeGateway);
    }

    // Logout / Lock button listener
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(){
        localStorage.removeItem(STORAGE_KEY);
        var pillLabel = document.getElementById('gateway-pill-label');
        if (pillLabel) pillLabel.textContent = 'KEY';
        var menuPill = document.getElementById('menu-pill-key');
        if (menuPill) menuPill.textContent = 'Enter Key';
        var guestBadge = document.getElementById('hero-guest-badge');
        if (guestBadge) guestBadge.style.display = 'none';
        openGateway(false);
      });
    }

    // Hint pills listeners
    var hintPills = document.querySelectorAll('.hint-pill');
    hintPills.forEach(function(pill){
      pill.addEventListener('click', function(){
        var key = this.getAttribute('data-key');
        if (key && WEDDING_VERSIONS[key]) {
          if (input) input.value = WEDDING_VERSIONS[key].canonicalKey;
          handleUnlock(key);
        }
      });
    });

    // Header Pill click listener
    if (pillBtn) {
      pillBtn.addEventListener('click', function(e){
        e.preventDefault();
        openGateway(true);
      });
    }

    // Menu switch link listener
    if (menuSwitchKey) {
      menuSwitchKey.addEventListener('click', function(e){
        e.preventDefault();
        var menuPanel = document.getElementById('menu-panel');
        if (menuPanel) menuPanel.classList.remove('open');
        openGateway(true);
      });
    }

    // Close on Escape key if authenticated
    window.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
        var saved = normalizeCode(localStorage.getItem(STORAGE_KEY));
        if (saved && WEDDING_VERSIONS[saved]) {
          closeGateway();
        }
      }
    });

    /* ── AUTHENTICATION CHECK ON PAGE LOAD ── */
    var autoKey = detectAutoKey();
    if (autoKey && WEDDING_VERSIONS[autoKey]) {
      // Smart Auto-detection unlocked
      localStorage.setItem(STORAGE_KEY, autoKey);
      applyWeddingVersion(autoKey);
      document.body.classList.remove('gateway-locked');
      if (overlay) overlay.classList.remove('active');
    } else {
      var savedKey = normalizeCode(localStorage.getItem(STORAGE_KEY));
      if (savedKey && WEDDING_VERSIONS[savedKey]) {
        // Authenticated via localStorage
        applyWeddingVersion(savedKey);
        document.body.classList.remove('gateway-locked');
        if (overlay) overlay.classList.remove('active');
      } else {
        // Not authenticated: present the private invitation gateway
        openGateway(false);
      }
    }
  }

  // Initialize Gateway when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGateway);
  } else {
    initGateway();
  }

  /* ── 6. MOBILE MENU ──────────────────────────────────── */
  var btn = document.getElementById('menu-btn'),
      panel = document.getElementById('menu-panel'),
      close = document.getElementById('menu-close');
  if (btn && panel) {
    btn.addEventListener('click', function(){ panel.classList.add('open'); });
    if (close) close.addEventListener('click', function(){ panel.classList.remove('open'); });
    panel.addEventListener('click', function(e){
      if (e.target.tagName === 'A' && e.target.id !== 'menu-switch-key') {
        panel.classList.remove('open');
      }
    });
  }

  /* ── 7. COUNTDOWN TO BARAAT (21 Nov 2026, 10 AM IST) ── */
  var cd = document.getElementById('countdown');
  if (cd) {
    var wed = new Date('2026-11-21T10:00:00+05:30');
    function tick(){
      var ms = wed - Date.now();
      if (ms <= 0) {
        cd.innerHTML = '<div class="unit"><span class="num">॥</span><span class="lbl">just married</span></div>';
        return;
      }
      var d = Math.floor(ms / 864e5),
          h = Math.floor(ms % 864e5 / 36e5),
          m = Math.floor(ms % 36e5 / 6e4);
      cd.innerHTML =
        '<div class="unit"><span class="num">' + d + '</span><span class="lbl">days</span></div>' +
        '<div class="unit"><span class="num">' + h + '</span><span class="lbl">hours</span></div>' +
        '<div class="unit"><span class="num">' + m + '</span><span class="lbl">minutes</span></div>';
      setTimeout(tick, 3e4);
    }
    tick();
  }

  /* ── 8. REVEAL ON SCROLL ─────────────────────────────── */
  var els = document.querySelectorAll('.r');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, {rootMargin: '0px 0px -8% 0px'});
    els.forEach(function(el){ io.observe(el); });
  } else {
    els.forEach(function(el){ el.classList.add('in'); });
  }

  /* ── 9. IMMERSIVE ADDRESS BAR PERSISTENCE SYSTEM ── */
  function initImmersiveAppScroller() {
    if (typeof window === 'undefined' || !('ontouchstart' in window) || window.innerWidth > 1024) return;

    var main = document.querySelector('main');
    if (!main) return;

    document.documentElement.classList.add('app-scroller-active');
    document.body.classList.add('app-scroller-active');

    // Trigger initial 1px scroll on first touch to collapse address bar
    var hasTriggeredCollapse = false;
    function collapseInitial() {
      if (hasTriggeredCollapse) return;
      hasTriggeredCollapse = true;
      if (window.scrollY === 0) {
        window.scrollBy({ top: 1, left: 0, behavior: 'smooth' });
      }
    }
    window.addEventListener('touchstart', collapseInitial, { passive: true, once: true });

    // Manage overscroll: contain mid-page so address bar stays hidden on upward scroll
    var touchStartY = 0;
    main.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    main.addEventListener('touchmove', function(e) {
      if (main.scrollTop <= 0) {
        var currentY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : 0;
        if (currentY > touchStartY) {
          // User is at the absolute top and pulling DOWN -> allow natural bounce
          main.style.overscrollBehaviorY = 'auto';
        } else {
          main.style.overscrollBehaviorY = 'contain';
        }
      } else {
        // User is mid-page -> contain overscroll to keep address bar 100% hidden
        main.style.overscrollBehaviorY = 'contain';
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImmersiveAppScroller);
  } else {
    initImmersiveAppScroller();
  }

})();

