/* ── GTM2026 Global Continuous Audio Controller ── */
(function() {
  'use strict';

  var STORAGE_KEY_STATE = 'gtm2026_music_state';
  var STORAGE_KEY_TIME = 'gtm2026_music_time';
  var STORAGE_KEY_SESSION_INIT = 'gtm2026_session_audio_initialized';
  var AUDIO_SRC = 'media/Samne_Yeh_Kaun_Aaya.mp3';

  var audio = document.getElementById('bg-music');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'bg-music';
    audio.loop = true;
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.innerHTML = '<source src="' + AUDIO_SRC + '" type="audio/mpeg">';
    document.body.appendChild(audio);
  }

  // 1. Audio resets ONLY when index.html is loaded for the first time in a session
  var path = window.location.pathname.split('/').pop().toLowerCase();
  try { path = decodeURIComponent(path); } catch(e) {}
  var isIndexPage = (!path || path === '' || path === 'index.html' || path === 'gm.html' || path === 'home.html' || path === 'us.html');

  if (isIndexPage && !sessionStorage.getItem(STORAGE_KEY_SESSION_INIT)) {
    try {
      localStorage.removeItem(STORAGE_KEY_TIME);
      sessionStorage.removeItem(STORAGE_KEY_TIME);
      sessionStorage.setItem(STORAGE_KEY_SESSION_INIT, 'true');
    } catch(e) {}
    if (audio) {
      audio.currentTime = 0;
    }
  }

  function getPlayerElement() {
    return document.getElementById('global-music-player') || document.getElementById('music-toggle');
  }

  function updateUI(isPlaying) {
    var player = getPlayerElement();
    if (player) {
      if (isPlaying) {
        player.classList.add('is-playing');
        player.setAttribute('aria-label', 'Pause Music');
      } else {
        player.classList.remove('is-playing');
        player.setAttribute('aria-label', 'Play Music');
      }
    }
  }

  function getSavedState() {
    return localStorage.getItem(STORAGE_KEY_STATE) || sessionStorage.getItem(STORAGE_KEY_STATE);
  }

  function setSavedState(state) {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, state);
      sessionStorage.setItem(STORAGE_KEY_STATE, state);
    } catch(e) {}
  }

  function saveTime() {
    if (audio && !isNaN(audio.currentTime) && audio.currentTime > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_TIME, audio.currentTime.toString());
      } catch(e) {}
    }
  }

  function restoreTime() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY_TIME);
      if (saved) {
        var t = parseFloat(saved);
        if (!isNaN(t) && t > 0) {
          audio.currentTime = t;
        }
      }
    } catch(e) {}
  }

  function playAudio() {
    restoreTime();
    audio.volume = 0.85;
    var promise = audio.play();
    if (promise !== undefined) {
      promise.then(function() {
        setSavedState('playing');
        updateUI(true);
      }).catch(function(err) {
        // Handled via gesture
      });
    }
  }

  function pauseAudio() {
    audio.pause();
    saveTime();
    setSavedState('paused');
    updateUI(false);
  }

  function toggleAudio(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (audio.paused) {
      playAudio();
    } else {
      pauseAudio();
    }
  }

  // First tap anywhere on the site starts the audio automatically
  function onFirstUserGesture() {
    var state = getSavedState();
    if (state !== 'paused') {
      if (audio.paused) {
        playAudio();
      }
    }
    window.removeEventListener('touchstart', onFirstUserGesture, { capture: true });
    window.removeEventListener('pointerdown', onFirstUserGesture, { capture: true });
    window.removeEventListener('click', onFirstUserGesture, { capture: true });
    window.removeEventListener('keydown', onFirstUserGesture, { capture: true });
  }

  window.addEventListener('touchstart', onFirstUserGesture, { capture: true, passive: true });
  window.addEventListener('pointerdown', onFirstUserGesture, { capture: true, passive: true });
  window.addEventListener('click', onFirstUserGesture, { capture: true });
  window.addEventListener('keydown', onFirstUserGesture, { capture: true });

  audio.addEventListener('timeupdate', function() {
    if (!audio.paused) {
      saveTime();
    }
  });

  window.addEventListener('pagehide', saveTime);
  window.addEventListener('beforeunload', saveTime);

  function bindButton() {
    var player = getPlayerElement();
    if (player) {
      player.onclick = toggleAudio;
    }
    var currentState = getSavedState();
    if (currentState === 'playing') {
      restoreTime();
      var p = audio.play();
      if (p !== undefined) {
        p.then(function() { updateUI(true); }).catch(function() { updateUI(false); });
      }
    } else if (currentState === 'paused') {
      updateUI(false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButton);
  } else {
    bindButton();
  }
})();
