/* Garima weds Mrinal · shared behaviour */
(function(){
  /* mobile menu */
  var btn=document.getElementById('menu-btn'),
      panel=document.getElementById('menu-panel'),
      close=document.getElementById('menu-close');
  if(btn&&panel){
    btn.addEventListener('click',function(){panel.classList.add('open')});
    close.addEventListener('click',function(){panel.classList.remove('open')});
    panel.addEventListener('click',function(e){if(e.target.tagName==='A')panel.classList.remove('open')});
  }

  /* countdown to the baraat — 21 Nov 2026, 10 AM IST */
  var cd=document.getElementById('countdown');
  if(cd){
    var wed=new Date('2026-11-21T10:00:00+05:30');
    function tick(){
      var ms=wed-Date.now();
      if(ms<=0){
        cd.innerHTML='<div class="unit"><span class="num">॥</span><span class="lbl">just married</span></div>';
        return;
      }
      var d=Math.floor(ms/864e5),
          h=Math.floor(ms%864e5/36e5),
          m=Math.floor(ms%36e5/6e4);
      cd.innerHTML=
        '<div class="unit"><span class="num">'+d+'</span><span class="lbl">days</span></div>'+
        '<div class="unit"><span class="num">'+h+'</span><span class="lbl">hours</span></div>'+
        '<div class="unit"><span class="num">'+m+'</span><span class="lbl">minutes</span></div>';
      setTimeout(tick,3e4);
    }
    tick();
  }

  /* reveal on scroll */
  var els=document.querySelectorAll('.r');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}
      });
    },{rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(el){io.observe(el)});
  }else{
    els.forEach(function(el){el.classList.add('in')});
  }
})();
