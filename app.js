(() => {
  'use strict';
  const config = window.PROPERTY_CONFIG;
  const photos = config.photos;
  const grid = document.getElementById('gallery-grid');
  const count = document.getElementById('gallery-count');
  const more = document.getElementById('load-more');
  const dialog = document.getElementById('photo-dialog');
  const largeImage = document.getElementById('lightbox-image');
  const thumbStrip = document.getElementById('lightbox-thumbs');
  let currentFilter = 'all';
  let visibleLimit = 12;
  let currentIndex = 0;
  let lastFocused = null;
  let toastTimer;

  const whatsappUrl = message => `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`;
  const defaultMessage = 'Olá! Tenho interesse na moradia T6 em Poço Barreto, Silves, anunciada por 550 000 €. Gostaria de receber mais informações.';
  document.querySelectorAll('[data-whatsapp]').forEach(link => {
    link.href = whatsappUrl(link.dataset.intent || defaultMessage);
  });
  document.querySelectorAll('[data-phone-display]').forEach(element => { element.textContent = config.whatsappDisplay; });
  document.querySelectorAll('[data-telephone]').forEach(link => {
    link.href = `tel:+${config.telephoneNumber}`;
  });
  document.querySelectorAll('[data-telephone-display]').forEach(element => { element.textContent = config.telephoneDisplay; });
  document.querySelectorAll('[data-email]').forEach(link => { link.href = `mailto:${config.email}`; });
  document.querySelectorAll('[data-email-display]').forEach(element => { element.textContent = config.email; });
  if (config.contactName.trim()) {
    document.querySelectorAll('[data-contact-name]').forEach(element => {
      element.textContent = config.contactName.trim();
      element.hidden = false;
    });
  }

  function renderGallery() {
    const filtered = currentFilter === 'all' ? photos : photos.filter(photo => photo.category === currentFilter);
    grid.replaceChildren();
    filtered.slice(0, visibleLimit).forEach(photo => {
      const button = document.createElement('button');
      button.className = 'gallery-item';
      button.dataset.photo = photo.id;
      button.setAttribute('aria-label', `Abrir fotografia ${photo.id}: ${photo.alt}`);
      const image = document.createElement('img');
      image.src = `images/thumb/${photo.file}.webp`;
      image.alt = photo.alt;
      image.width = 650;
      image.height = 433;
      image.loading = 'lazy';
      image.decoding = 'async';
      const caption = document.createElement('span');
      caption.textContent = photo.alt;
      const number = document.createElement('small');
      number.className = 'photo-number';
      number.textContent = photo.file;
      button.append(image, caption, number);
      grid.append(button);
    });
    const shown = Math.min(visibleLimit, filtered.length);
    count.textContent = `A mostrar ${shown} de ${filtered.length}`;
    more.hidden = shown >= filtered.length;
  }

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter;
      visibleLimit = 12;
      document.querySelectorAll('[data-filter]').forEach(filter => {
        const active = filter === button;
        filter.classList.toggle('active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      renderGallery();
    });
  });
  more.addEventListener('click', () => { visibleLimit += 12; renderGallery(); });
  renderGallery();

  photos.forEach(photo => {
    const button = document.createElement('button');
    button.dataset.photo = photo.id;
    button.setAttribute('aria-label', `Ver fotografia ${photo.id}`);
    const image = document.createElement('img');
    image.dataset.src = `images/thumb/${photo.file}.webp`;
    image.alt = photo.alt;
    image.width = 95;
    image.height = 65;
    image.loading = 'lazy';
    button.append(image);
    thumbStrip.append(button);
  });

  function updateLightbox() {
    const photo = photos[currentIndex];
    largeImage.src = `images/original/${photo.file}.jpg`;
    largeImage.alt = photo.alt;
    document.getElementById('lightbox-count').textContent = `${currentIndex + 1} / ${photos.length}`;
    document.getElementById('lightbox-caption').textContent = photo.alt;
    const download = document.getElementById('photo-download');
    download.href = `images/original/${photo.file}.jpg`;
    download.download = `Casa_Silves_${photo.file}.jpg`;
    document.getElementById('ask-about-photo').href = whatsappUrl(`Olá! Gostaria de saber mais sobre a fotografia ${photo.file} (${photo.alt.toLowerCase()}) da moradia T6 em Poço Barreto, Silves.`);
    thumbStrip.querySelectorAll('button').forEach(button => {
      const selected = Number(button.dataset.photo) === photo.id;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-current', selected ? 'true' : 'false');
      if (selected) button.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'});
    });
    const next = photos[(currentIndex + 1) % photos.length];
    const preload = new Image();
    preload.src = `images/large/${next.file}.webp`;
  }

  function openPhoto(id) {
    const found = photos.findIndex(photo => photo.id === Number(id));
    currentIndex = found >= 0 ? found : 0;
    if (!dialog.open) {
      lastFocused = document.activeElement;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      thumbStrip.querySelectorAll('img[data-src]').forEach(image => {
        image.src = image.dataset.src;
        image.removeAttribute('data-src');
      });
    }
    updateLightbox();
  }
  const stepPhoto = direction => { currentIndex = (currentIndex + direction + photos.length) % photos.length; updateLightbox(); };
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-photo]');
    if (trigger) openPhoto(trigger.dataset.photo);
  });
  document.getElementById('open-all-photos').addEventListener('click', () => openPhoto(1));
  document.getElementById('close-lightbox').addEventListener('click', () => dialog.close());
  document.getElementById('previous-photo').addEventListener('click', () => stepPhoto(-1));
  document.getElementById('next-photo').addEventListener('click', () => stepPhoto(1));
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; lastFocused?.focus(); });
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); stepPhoto(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepPhoto(-1); }
  });
  let touchStart = null;
  largeImage.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, {passive:true});
  largeImage.addEventListener('touchend', event => {
    if (touchStart === null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 55) stepPhoto(distance < 0 ? 1 : -1);
    touchStart = null;
  }, {passive:true});

  function toast(message) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('visible'), 3400);
  }
  document.getElementById('share-property').addEventListener('click', async () => {
    const url = config.siteUrl + '/';
    if (navigator.share) {
      try { await navigator.share({title:'Moradia T6 em Silves · Casa do Pomar',text:'550 000 € · 6 quartos · terreno de 12 240 m²',url}); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Ligação copiada. Pode partilhá-la.'); }
    catch { toast('Não foi possível copiar. Copie a ligação da barra de endereço.'); }
  });
  document.getElementById('contact-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = document.getElementById('visitor-name').value.trim();
    const interest = document.getElementById('visitor-interest').value;
    const message = document.getElementById('visitor-message').value.trim();
    const text = [`Olá!${name ? ` O meu nome é ${name}.` : ''}`,`${interest} sobre a moradia T6 em Poço Barreto, Silves (550 000 €).`,message].filter(Boolean).join('\n\n');
    window.open(whatsappUrl(text), '_blank', 'noopener,noreferrer');
  });

  const sectionLinks = Array.from(document.querySelectorAll('.section-nav a'));
  const sections = sectionLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio);
      if (!visible.length) return;
      sectionLinks.forEach(link => link.classList.toggle('active', link.hash === `#${visible[0].target.id}`));
    }, {rootMargin:'-155px 0px -45% 0px',threshold:[0,.1,.3]});
    sections.forEach(section => observer.observe(section));
  }
})();
