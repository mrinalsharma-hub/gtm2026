(function() {
  if (window._pjaxEnabled) return;
  window._pjaxEnabled = true;

  // Initialize Global Music Player
  let audio = document.getElementById('bg-music');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'bg-music';
    audio.loop = true;
    audio.preload = 'auto';
    const source = document.createElement('source');
    source.src = 'media/Heer_Flute.mp3';
    source.type = 'audio/mpeg';
    audio.appendChild(source);
    document.body.appendChild(audio);
  }

  // Attempt Autoplay
  const playPromise = audio.play();
  if (playPromise !== undefined) {
      playPromise.catch(() => {
          // Autoplay was prevented by browser policy (user needs to interact first)
      });
  }

  // Create Toggle UI
  const toggleBtn = document.getElementById('global-music-toggle');
  if(!toggleBtn) return;

  const svgPlay = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#A71F23"><path d="M8 5v14l11-7z"/></svg>';
  const svgPause = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#A71F23"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

  function updateToggleUI() {
      if (audio.paused) {
          toggleBtn.innerHTML = svgPlay;
      } else {
          toggleBtn.innerHTML = svgPause;
      }
  }

  updateToggleUI();

  audio.addEventListener('play', updateToggleUI);
  audio.addEventListener('pause', updateToggleUI);

  toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (audio.paused) {
          audio.play();
      } else {
          audio.pause();
      }
  });


  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;
    
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) return;
    const hrefAttr = link.getAttribute('href') || '';
    if (hrefAttr.startsWith('#') || hrefAttr.startsWith('tel:') || hrefAttr.startsWith('mailto:')) return;
    if (link.target === '_blank') return;
    if (link.classList.contains('no-pjax')) return;

    e.preventDefault();

    fetch(url.href)
      .then(r => r.text())
      .then(html => {
         const doc = new DOMParser().parseFromString(html, 'text/html');
         
         // Remove all children EXCEPT the audio and toggle element
         Array.from(document.body.childNodes).forEach(node => {
             if (node.id !== 'bg-music' && node.id !== 'global-music-toggle') {
                 document.body.removeChild(node);
             }
         });
         
         // Adopt and append all children from the new document
         Array.from(doc.body.childNodes).forEach(node => {
             if (node.id === 'bg-music' || node.id === 'global-music-toggle') return; // skip if doc has its own
             const adopted = document.adoptNode(node);
             document.body.appendChild(adopted);
         });
         
         document.title = doc.title;
         history.pushState(null, '', url.href);
         
         // Manually re-execute all scripts in the new body
         const scripts = document.body.querySelectorAll('script');
         scripts.forEach(oldScript => {
             if (oldScript.src && oldScript.src.indexOf('pjax.js') !== -1) return; // don't loop pjax
             const newScript = document.createElement('script');
             Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
             if (oldScript.innerHTML) {
                 newScript.appendChild(document.createTextNode(oldScript.innerHTML));
             }
             oldScript.parentNode.replaceChild(newScript, oldScript);
         });
         
         window.document.dispatchEvent(new Event("DOMContentLoaded", {
           bubbles: true,
           cancelable: true
         }));
      })
      .catch(err => {
         console.error("PJAX Error", err);
         window.location.href = link.href;
      });
  });

  window.addEventListener("popstate", function() {
      window.location.reload();
  });

  // Re-append the toggleBtn to keep it physically at the very end of body so it sits on top of absolute children reliably, just in case
  // Wait, z-index handles that.
})();
