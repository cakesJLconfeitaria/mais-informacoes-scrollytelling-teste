/* Aproximação e passagem entre fotos na entrada das categorias. */
(function () {
  'use strict';

  var vitrines = document.querySelectorAll('[data-vitrine]');
  if (!vitrines.length) return;

  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  var podeFixar = window.CSS && CSS.supports('position', 'sticky');

  function limitar(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
  }

  function numero(valor, padrao) {
    var resultado = parseFloat(valor);
    return isFinite(resultado) ? resultado : padrao;
  }

  function suave(valor) {
    var p = limitar(valor, 0, 1);
    return p * p * (3 - 2 * p);
  }

  function iniciar(vitrine) {
    var palco = vitrine.querySelector('[data-vitrine-stage]');
    var fotos = Array.prototype.slice.call(vitrine.querySelectorAll('[data-vitrine-frame]'));
    var atalho = vitrine.querySelector('.vitrine-skip');
    var destino = atalho && document.getElementById(atalho.hash.slice(1));
    if (!palco || !fotos.length || !destino) return;

    var zoom = limitar(numero(vitrine.dataset.vitrineZoom, 1.8), 1, 2.4);
    var inicio = 0, fim = 1, quadro = 0, ativa = true;

    // Cada foto pode ajustar seu enquadramento quando chegam as imagens definitivas.
    fotos.forEach(function (foto) {
      foto.style.setProperty('--vitrine-focus-x', limitar(numero(foto.dataset.focusX, 50), 0, 100) + '%');
      foto.style.setProperty('--vitrine-focus-y', limitar(numero(foto.dataset.focusY, 50), 0, 100) + '%');
      foto.addEventListener('load', agendar);
    });

    function desenharFotos(progresso) {
      var aproximacao = 1 + (zoom - 1) * suave(progresso);
      fotos.forEach(function (foto, indice) {
        var escala = limitar(numero(foto.dataset.scale, 1), .5, 2);
        var entrada = fotos.length === 2 ? .42 : indice === 1 ? .28 : .64;
        var pronta = foto.complete && foto.naturalWidth > 0;
        foto.style.transform = 'scale(' + (aproximacao * escala).toFixed(4) + ')';
        foto.style.opacity = indice === 0 ? '1' : pronta ? String(suave((progresso - entrada) / .2)) : '0';
      });
    }

    function atualizar() {
      quadro = 0;
      if (!vitrine.classList.contains('is-animated')) return;
      var progresso = limitar((window.scrollY - inicio) / Math.max(1, fim - inicio), 0, 1);
      desenharFotos(progresso);
      vitrine.style.setProperty('--vitrine-progress', progresso.toFixed(4));
    }

    function agendar() {
      if (!quadro) quadro = window.requestAnimationFrame(atualizar);
    }

    function medir() {
      var altura = palco.offsetHeight;
      var alturaTela = document.documentElement.clientHeight;
      var distancia = limitar(alturaTela * .55, 280, 480);
      vitrine.style.setProperty('--vitrine-stage-height', altura + 'px');
      vitrine.style.setProperty('--vitrine-travel', distancia + 'px');
      if (movimentoReduzido.matches || !podeFixar) {
        vitrine.classList.remove('is-animated');
        fotos.forEach(function (foto, indice) {
          foto.style.transform = '';
          foto.style.opacity = indice === 0 ? '1' : '0';
        });
        return;
      }
      vitrine.classList.add('is-animated');
      var topo = vitrine.getBoundingClientRect().top + window.scrollY;
      inicio = Math.max(0, topo - alturaTela * .32);
      fim = Math.max(inicio + 1, topo + distancia - 16);
      agendar();
    }

    atalho.addEventListener('click', function (evento) {
      if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
      evento.preventDefault();
      destino.scrollIntoView({ behavior: movimentoReduzido.matches ? 'instant' : 'smooth', block: 'start' });
      // O foco acompanha o salto para não deixar quem usa teclado na foto anterior.
      var controle = destino.querySelector('[data-torta-target], .order-form .flavor-trigger') ||
        destino.querySelector('button:not([disabled]), input:not([disabled]), a[href]');
      if (controle) controle.focus({ preventScroll: true });
      window.history.replaceState(null, '', atalho.hash);
    });

    window.addEventListener('scroll', function () {
      if (ativa) agendar();
    }, { passive: true });
    window.addEventListener('resize', medir);
    window.addEventListener('pageshow', medir);
    if (movimentoReduzido.addEventListener) movimentoReduzido.addEventListener('change', medir);
    else movimentoReduzido.addListener(medir);

    if ('IntersectionObserver' in window) {
      var observador = new IntersectionObserver(function (entradas) {
        ativa = entradas[0].isIntersecting;
        agendar();
      }, { rootMargin: '80px 0px' });
      observador.observe(vitrine);
    }

    fotos[0].addEventListener('error', function () {
      vitrine.hidden = true;
    });
    if (fotos[0].complete && !fotos[0].naturalWidth) vitrine.hidden = true;
    medir();
  }

  Array.prototype.forEach.call(vitrines, iniciar);
})();
