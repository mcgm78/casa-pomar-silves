(() => {
  'use strict';
  const tour = window.HOUSE_TOUR;
  if (!tour || !window.pannellum) return;
  const select = document.getElementById('tour-room-select');
  const list = document.getElementById('tour-room-list');
  const start = document.getElementById('start-tour');
  const status = document.getElementById('tour-status');
  const rotate = document.getElementById('tour-rotate');
  const fullscreen = document.getElementById('tour-fullscreen');
  const fallback = document.getElementById('tour-fallback');
  let viewer = null;
  let activeScene = tour.firstScene;
  let photoMode = false;
  let rotating = false;

  tour.sceneOrder.forEach(id => {
    const scene = tour.scenes[id];
    const option = document.createElement('option');
    option.value = id;
    option.textContent = scene.title;
    select.append(option);
    const button = document.createElement('button');
    button.dataset.scene = id;
    button.setAttribute('aria-label', `Visitar: ${scene.title}`);
    const image = document.createElement('img');
    image.src = scene.preview;
    image.alt = scene.title;
    image.width = 116;
    image.height = 62;
    image.loading = 'lazy';
    const label = document.createElement('span');
    label.textContent = scene.title;
    button.append(image, label);
    button.addEventListener('click', () => changeScene(id));
    list.append(button);
  });

  function updateScene(id) {
    if (!tour.scenes[id]) return;
    activeScene = id;
    select.value = id;
    list.querySelectorAll('button').forEach(button => {
      const selected = button.dataset.scene === id;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-current', String(selected));
      if (selected) {
        const left = button.offsetLeft - list.offsetLeft - (list.clientWidth - button.offsetWidth) / 2;
        list.scrollLeft = Math.max(0, left);
      }
    });
    if (photoMode) {
      const image = document.getElementById('tour-fallback-image');
      image.src = tour.scenes[id].cubeMap[0];
      image.alt = tour.scenes[id].title;
    }
  }

  function fallbackMode() {
    photoMode = true;
    rotating = false;
    rotate.disabled = true;
    rotate.setAttribute('aria-pressed','false');
    try { viewer?.stopAutoRotate(); } catch {}
    start.hidden = true;
    fallback.hidden = false;
    document.getElementById('tour-mode-label').textContent = 'EXPLORAR AS DIVISÕES · MODO FOTOGRAFIA';
    status.textContent = 'Escolha uma divisão no menu ou nas miniaturas.';
    updateScene(activeScene);
  }

  function startTour(id = activeScene) {
    activeScene = id;
    start.hidden = true;
    status.textContent = 'A preparar a visita virtual…';
    fullscreen.disabled = !document.getElementById('tour-frame').requestFullscreen;
    try {
      viewer = window.pannellum.viewer('panorama-viewer', {
        default: {
          firstScene:id,
          autoLoad:true,
          sceneFadeDuration:450,
          showFullscreenCtrl:false,
          mouseZoom:'fullscreenonly',
          hfov:90,
          minHfov:55,
          maxHfov:100,
          escapeHTML:true,
          orientationOnByDefault:false,
          strings:{
            loadButtonLabel:'Entrar na visita 360°',
            loadingLabel:'A carregar panorama…',
            bylineLabel:'',
            noPanoramaError:'Não foi possível abrir este panorama.',
            fileAccessError:'Não foi possível carregar a imagem.',
            malformedURLError:'A imagem do panorama não está disponível.',
            iOS8WebGLError:'O modo 360° não está disponível neste dispositivo.',
            genericWebGLError:'O modo 360° não está disponível neste dispositivo.',
            textureSizeError:'Este dispositivo não permite abrir o panorama em 360°.',
            unknownError:'Não foi possível iniciar o modo 360°.'
          }
        },
        scenes:tour.scenes
      });
      viewer.on('scenechange', id => { updateScene(id); status.textContent = 'Arraste para olhar à volta. Use as setas para passar para a próxima divisão.'; });
      viewer.on('load', () => { rotate.disabled = photoMode; status.textContent = 'Arraste para olhar à volta. Use as setas para mudar de divisão.'; });
      viewer.on('error', fallbackMode);
      updateScene(id);
    } catch { fallbackMode(); }
  }

  function changeScene(id) {
    if (!viewer && !photoMode) { startTour(id); return; }
    if (photoMode) { updateScene(id); return; }
    viewer.loadScene(id);
  }
  start.addEventListener('click', () => startTour());
  select.addEventListener('change', () => changeScene(select.value));
  function step(direction) {
    const index = tour.sceneOrder.indexOf(activeScene);
    changeScene(tour.sceneOrder[(index + direction + tour.sceneOrder.length) % tour.sceneOrder.length]);
  }
  document.getElementById('tour-previous').addEventListener('click', () => step(-1));
  document.getElementById('tour-next').addEventListener('click', () => step(1));
  rotate.addEventListener('click', () => {
    if (!viewer || photoMode) return;
    rotating = !rotating;
    if (rotating) viewer.startAutoRotate(-2); else viewer.stopAutoRotate();
    rotate.setAttribute('aria-pressed',String(rotating));
    rotate.setAttribute('aria-label',rotating ? 'Parar rotação automática' : 'Ativar rotação automática');
  });
  fullscreen.addEventListener('click', async () => {
    const frame = document.getElementById('tour-frame');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.requestFullscreen();
    } catch { status.textContent = 'O ecrã inteiro não está disponível neste navegador.'; }
    viewer?.resize();
  });
  document.addEventListener('fullscreenchange', () => {
    viewer?.resize();
    fullscreen.setAttribute('aria-label',document.fullscreenElement ? 'Sair do ecrã inteiro' : 'Abrir visita virtual em ecrã inteiro');
  });
  updateScene(activeScene);
})();
