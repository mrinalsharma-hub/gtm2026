/* ── GTM2026 Universal Continuous Audio Controller ── */
(function() {
  'use strict';

  var AUDIO_SRC = 'media/Samne_Yeh_Kaun_Aaya.mp3';
  var STORAGE_KEY_PLAYING = 'gtm2026_music_playing';
  var STORAGE_KEY_TIME = 'gtm2026_music_time';

  // Singleton Audio Object attached to window so SPA navigation never destroys or resets it
  if (!window.__GTM_AUDIO__) {
    var existingAudio = document.getElementById('bg-music');
    if (existingAudio) {
      window.__GTM_AUDIO__ = existingAudio;
    } else {
      var audioEl = document.createElement('audio');
      audioEl.id = 'bg-music';
      audioEl.loop = true;
      audioEl.preload = 'auto';
      audioEl.playsInline = true;
      audioEl.innerHTML = '<source src="' + AUDIO_SRC + '" type="audio/mpeg">';
      document.body.appendChild(audioEl);
      window.__GTM_AUDIO__ = audioEl;
    }
  }

  var audio = window.__GTM_AUDIO__;
  audio.volume = 0.85;

  function getPlayerElements() {
    return document.querySelectorAll('#global-music-player, #music-toggle, .global-audio-pill');
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
        if (!isNaN(t) && t > 0) {
          audio.currentTime = t;
        }
      }
    } catch(e) {}
  }

  function playAudio() {
    restoreTime();
    audio.volume = 0.85;
    var p = audio.play();
    if (p !== undefined) {
      p.then(function() {
        sessionStorage.setItem(STORAGE_KEY_PLAYING, 'true');
        updateUI(true);
      }).catch(function(err) {
        console.warn('Audio play prevented:', err);
        updateUI(false);
      });
    }
  }

  function pauseAudio() {
    audio.pause();
    saveTime();
    sessionStorage.setItem(STORAGE_KEY_PLAYING, 'false');
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

  function bindPlayer() {
    var players = getPlayerElements();
    players.forEach(function(player) {
      player.onclick = toggleAudio;
    });
    updateUI(!audio.paused);
  }

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
    pause: pauseAudio,
    toggle: toggleAudio,
    updateUI: updateUI,
    bindPlayer: bindPlayer,
    get audio() { return audio; },
    get isPlaying() { return !audio.paused; }
  };

  // NEVER AUTOPLAY ON LOAD OR GESTURE.
  // ONLY bind the explicit button click handler and sync the current playing/paused UI state.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPlayer);
  } else {
    bindPlayer();
  }
})();
