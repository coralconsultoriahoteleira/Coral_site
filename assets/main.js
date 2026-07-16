(function(){

  // Nav shadow on scroll
  const nav = document.getElementById('nav');
  if(nav){
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 32);
    }, {passive:true});
  }

  // Mobile drawer toggle
  const navMob = document.querySelector('.nav-mob');
  const mobDrawer = document.getElementById('mob-drawer');
  if(navMob && mobDrawer){
    navMob.addEventListener('click', () => mobDrawer.classList.toggle('open'));
  }
  document.querySelectorAll('.mob-tab[data-close-drawer]').forEach(el => {
    el.addEventListener('click', () => mobDrawer && mobDrawer.classList.remove('open'));
  });

  // Reveal on scroll (IntersectionObserver)
  function triggerReveals(){
    const ro = new IntersectionObserver(entries => {
      entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('in'); });
    }, {threshold:0.08});
    document.querySelectorAll('.reveal:not(.in)').forEach(el => ro.observe(el));
  }
  triggerReveals();

  // FAQ accordion
  window.toggleFaq = function(btn){
    const card = btn.closest('.faq-card');
    const isOpen = card.classList.contains('open');
    document.querySelectorAll('.faq-card.open').forEach(c => {
      c.classList.remove('open');
      const b = c.querySelector('.faq-q');
      if(b) b.setAttribute('aria-expanded','false');
    });
    if(!isOpen){
      card.classList.add('open');
      btn.setAttribute('aria-expanded','true');
    }
  };


  // WhatsApp Popup
  const popup = document.getElementById('wa-popup');
  const popupMsg = document.getElementById('wa-popup-msg');
  const popupLink = document.getElementById('wa-popup-link');
  const WA_POPUP = 'https://wa.me/5581991351085?text=';

  // Mensagem do popup varia conforme a página atual (via body[data-page])
  const currentPage = document.body.getAttribute('data-page') || 'index';
  const popupMessages = {
    'index': { text:'Olá! 👋 Tem alguma dúvida sobre como a Coral pode ajudar a sua pousada?', msg:'Olá,+vi+o+site+da+Coral+e+quero+saber+mais' },
    'saiba-mais': { text:'Quer entender melhor como funciona a parceria com a Coral? 😊', msg:'Olá,+quero+entender+melhor+como+funciona+a+Coral' },
    'abrir-pousada': { text:'Está abrindo uma pousada? A Coral pode ajudar a montar tudo do zero! 🏨', msg:'Olá,+estou+abrindo+uma+pousada+e+quero+ajuda' },
  };

  function closePopup(){
    if(popup){ popup.classList.remove('show'); }
    sessionStorage.setItem('wa_popup_closed','1');
  }
  window.closePopup = closePopup;

  function showPopup(){
    if(!popup) return;
    if(sessionStorage.getItem('wa_popup_closed')) return;
    const ctx = popupMessages[currentPage] || popupMessages['index'];
    if(popupMsg) popupMsg.textContent = ctx.text;
    if(popupLink) popupLink.href = WA_POPUP + ctx.msg;
    popup.classList.add('show');
    setTimeout(() => {
      if(popup.classList.contains('show')) closePopup();
    }, 30000);
  }

  if(!sessionStorage.getItem('wa_popup_closed')){
    setTimeout(showPopup, 20000);
  }

  // Contextual WhatsApp float button (muda texto conforme seção visível)
  const waLink = document.getElementById('wa-link');
  const waText = document.getElementById('wa-text');
  const WA_BASE = 'https://wa.me/5581991351085?text=';
  const ctxMessages = [
    { id:'tecnologias', text:'Olá,+quero+saber+mais+sobre+as+integrações+e+sistemas+parceiros', label:'Conversar agora' },

    { id:'como-funciona', text:'Olá,+quero+entender+como+funciona+a+parceria', label:'Conversar agora' },
    { id:'servicos', text:'Olá,+quero+saber+o+que+a+Coral+resolve+no+meu+hotel', label:'Conversar agora' },
    { id:'momento', text:'Olá,+estou+começando+uma+pousada+e+preciso+de+ajuda', label:'Conversar agora' },
    { id:'resultados', text:'Olá,+vi+os+resultados+e+quero+saber+mais', label:'Conversar agora' },
  ];
  if(waLink){
    window.addEventListener('scroll', () => {
      let match = null;
      ctxMessages.forEach(c => {
        const el = document.getElementById(c.id);
        if(el){
          const r = el.getBoundingClientRect();
          if(r.top < window.innerHeight * 0.65 && r.bottom > 0) match = c;
        }
      });
      if(match){
        waLink.href = WA_BASE + match.text;
        if(waText) waText.textContent = match.label;
      } else {
        waLink.href = WA_BASE + 'Olá,+vi+o+site+da+Coral+e+quero+saber+mais';
        if(waText) waText.textContent = 'Conversar agora';
      }
    }, {passive:true});
  }

  // Diagnostic form → WhatsApp (apenas em abrir-pousada.html)
  window.enviarDiagnostico = function(){
    const nome = document.getElementById('diag-nome')?.value.trim() || '';
    const pousada = document.getElementById('diag-pousada')?.value.trim() || '';
    const quartos = document.getElementById('diag-quartos')?.value || '';
    if(!nome){ alert('Por favor, informe seu nome.'); return; }
    const msg = `Olá! Estou abrindo uma pousada e quero ajuda para começar.%0A%0ANome: ${encodeURIComponent(nome)}%0APousada: ${encodeURIComponent(pousada || 'Ainda sem nome')}%0AQuartos: ${encodeURIComponent(quartos || 'Não informado')}`;
    window.open(`https://wa.me/5581991351085?text=${msg}`, '_blank');
  };

})();
