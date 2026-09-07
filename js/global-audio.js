/* ── GTM2026 Universal Continuous Audio Controller ── */
(function() {
  'use strict';

  var AUDIO_SRC = 'media/Samne_Yeh_Kaun_Aaya.mp3';
  var STORAGE_KEY_PLAYING = 'gtm2026_music_playing';
  var STORAGE_KEY_TIME = 'gtm2026_music_time';

  function isAuthPage() {
    if (document.getElementById('auth-viewport')) return true;
    var path = (window.location && window.location.pathname) ? window.location.pathname : '';
    if (path.indexOf('index.html') !== -1) return true;
    var isAuth = false;
    try {
      isAuth = sessionStorage.getItem('gtm2026_auth') === 'true' || localStorage.getItem('gtm2026_auth') === 'true';
    } catch(e) {}
    if (!isAuth && (path === '' || path === '/' || path.endsWith('/'))) return true;
    return false;
  }

  // Singleton Audio Object permanently anchored in document.head
  // This guarantees that SPA DOM transitions never touch, re-parent, or interrupt playback.
  if (!window.__GTM_AUDIO__) {
    var existingAudio = document.getElementById('bg-music');
    if (existingAudio) {
      window.__GTM_AUDIO__ = existingAudio;
      if (existingAudio.parentNode !== document.head) {
        (document.head || document.documentElement).appendChild(existingAudio);
      }
    } else {
      var audioEl = document.createElement('audio');
      audioEl.id = 'bg-music';
      audioEl.loop = true;
      audioEl.preload = 'none';
      audioEl.playsInline = true;
      audioEl.innerHTML = '<source src="' + AUDIO_SRC + '" type="audio/mpeg">';
      (document.head || document.documentElement).appendChild(audioEl);
      window.__GTM_AUDIO__ = audioEl;
    }
  }

  var audio = window.__GTM_AUDIO__;
  audio.volume = 0.85;
  audio.loop = true;
  audio.playsInline = true;

  // On auth page, ensure audio is paused and stays paused
  if (isAuthPage() && audio) {
    try { audio.pause(); } catch(e) {}
  }

  function deduplicatePlayers() {
    var globalPlayers = document.querySelectorAll('#global-music-player, .celebration-player-btn');
    if (globalPlayers.length > 1) {
      for (var i = 1; i < globalPlayers.length; i++) {
        globalPlayers[i].remove();
      }
    }
    var vinylPlayers = document.querySelectorAll('#music-toggle');
    if (vinylPlayers.length > 1) {
      for (var j = 1; j < vinylPlayers.length; j++) {
        vinylPlayers[j].remove();
      }
    }
  }

  function getPlayerElements() {
    deduplicatePlayers();
    return document.querySelectorAll('#global-music-player, #music-toggle, .celebration-player-btn, .gxm-vinyl-anchor, .global-audio-pill');
  }

  function updateUI(playing) {
    var isCurrentlyPlaying = (playing !== undefined) ? playing : !audio.paused;
    var players = getPlayerElements();
    players.forEach(function(player) {
      if (isCurrentlyPlaying) {
        player.classList.add('is-playing');
        player.setAttribute('aria-label', 'Pause Music');
      } else {
        player.classList.remove('is-playing');
        player.setAttribute('aria-label', 'Play Music');
      }
    });
  }

  function saveTime() {
    if (audio && !isNaN(audio.currentTime) && audio.currentTime > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY_TIME, audio.currentTime.toString());
      } catch(e) {}
    }
  }

  function restoreTime() {
    try {
      var saved = sessionStorage.getItem(STORAGE_KEY_TIME);
      if (saved) {
        var t = parseFloat(saved);
        if (!isNaN(t) && t > 0 && Math.abs((audio.currentTime || 0) - t) > 1.5) {
          audio.currentTime = t;
        }
      }
    } catch(e) {}
  }

  function playAudio(forceStart) {
    if (!audio) return Promise.reject(new Error('No audio element'));

    // Audio MUST NEVER play on auth gateway unless explicitly unlocked
    if (isAuthPage() && !forceStart) {
      return Promise.resolve();
    }

    if (forceStart) {
      try {
        sessionStorage.removeItem(STORAGE_KEY_TIME);
      } catch(e) {}
      audio.currentTime = 0;
    } else if (!audio.paused) {
      // Audio is already smoothly playing! Do not touch or seek!
      updateUI(true);
      return Promise.resolve();
    } else {
      restoreTime();
    }

    audio.volume = 0.85;
    var p = audio.play();
    if (p !== undefined) {
      return p.then(function() {
        try {
          sessionStorage.setItem(STORAGE_KEY_PLAYING, 'true');
          localStorage.setItem(STORAGE_KEY_PLAYING, 'true');
        } catch(e) {}
        updateUI(true);
      }).catch(function(err) {
        console.warn('Audio auto-play deferred to user gesture:', err);
        updateUI(false);
      });
    }
    return Promise.resolve();
  }

  function pauseAudio() {
    if (!audio) return;
    audio.pause();
    saveTime();
    try {
      sessionStorage.setItem(STORAGE_KEY_PLAYING, 'false');
      localStorage.setItem(STORAGE_KEY_PLAYING, 'false');
    } catch(e) {}
    updateUI(false);
  }

  function toggleAudio(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (audio.paused) {
      playAudio(false);
    } else {
      pauseAudio();
    }
  }

  function bindPlayer() {
    var players = getPlayerElements();
    players.forEach(function(player) {
      player.onclick = toggleAudio;
    });
    updateUI(!audio.paused);
  }

  function autoStartIfRequested() {
    if (isAuthPage()) {
      if (audio && !audio.paused) audio.pause();
      return;
    }
    var shouldPlay = false;
    try {
      shouldPlay = sessionStorage.getItem(STORAGE_KEY_PLAYING) === 'true' || 
                   localStorage.getItem(STORAGE_KEY_PLAYING) === 'true';
    } catch(e) {}

    if (shouldPlay && audio && audio.paused) {
      playAudio(false);
    }
  }

  function handleFirstGesture() {
    if (isAuthPage()) return;
    var shouldPlay = false;
    try {
      shouldPlay = sessionStorage.getItem(STORAGE_KEY_PLAYING) === 'true' || 
                   localStorage.getItem(STORAGE_KEY_PLAYING) === 'true';
    } catch(e) {}

    if (shouldPlay && audio && audio.paused) {
      playAudio(false);
    }
  }

  window.addEventListener('touchstart', handleFirstGesture, { passive: true, once: true });
  window.addEventListener('pointerdown', handleFirstGesture, { passive: true, once: true });
  window.addEventListener('click', handleFirstGesture, { passive: true, once: true });

  audio.addEventListener('play', function() { updateUI(true); });
  audio.addEventListener('pause', function() { updateUI(false); });
  audio.addEventListener('timeupdate', function() {
    if (!audio.paused) saveTime();
  });

  window.addEventListener('pagehide', saveTime);
  window.addEventListener('beforeunload', saveTime);

  // Expose global controller
  window.GTM_AUDIO = {
    play: playAudio,
    playFromStart: function() { return playAudio(true); },
    ensureAudioPlaying: playAudio,
    pause: pauseAudio,
    toggle: toggleAudio,
    updateUI: updateUI,
    bindPlayer: bindPlayer,
    get audio() { return audio; },
    get isPlaying() { return !audio.paused; }
  };

  function init() {
    bindPlayer();
    if (!isAuthPage()) {
      autoStartIfRequested();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('gtm:page-loaded', function() {
    bindPlayer();
    if (!isAuthPage()) {
      if (audio && audio.paused) {
        autoStartIfRequested();
      } else {
        updateUI(true);
      }
    } else {
      if (audio && !audio.paused) audio.pause();
    }
  });
})();
