(function() {
  if (window._pjaxEnabled) return;
  window._pjaxEnabled = true;

  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;
    
    // Exclude external links and hashes
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
         
         const audio = document.getElementById('bg-music');
         
         // Remove all children EXCEPT the audio element
         Array.from(document.body.childNodes).forEach(node => {
             if (node !== audio) {
                 document.body.removeChild(node);
             }
         });
         
         // Adopt and append all children from the new document
         Array.from(doc.body.childNodes).forEach(node => {
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
         
         // Dispatch DOMContentLoaded for scripts that listen to it
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
})();
