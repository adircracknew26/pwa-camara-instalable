// ============================================================================
// Fase 1: Configuración de Instalabilidad (beforeinstallprompt, iOS y SW)
// Restricción técnica: 100% Vanilla JS con .then(), .catch() y .finally()
// ============================================================================

let eventoInstalacionDiferido = null;

const btnInstalar = document.getElementById('btn-instalar');
const avisoPermiso = document.getElementById('aviso-permiso');
const btnPrepararCamara = document.getElementById('btn-preparar-camara');
const btnConfirmarPermiso = document.getElementById('btn-confirmar-permiso');
const btnAlternarCamara = document.getElementById('btn-alternar-camara');
const btnApagarCamara = document.getElementById('btn-apagar-camara');
const visorVideo = document.getElementById('visor-camara');
const mensajeEstado = document.getElementById('mensaje-estado');
const indicadorLed = document.getElementById('indicador-led');
const lenteSolicitadoTexto = document.getElementById('lente-solicitado-texto');

// Fragmento B: Captura del Evento de Instalación
window.addEventListener('beforeinstallprompt', (event) => {
  // Evita que el mini-banner automático aparezca antes de tiempo
  event.preventDefault();
  eventoInstalacionDiferido = event;

  // Muestra tu botón personalizado de instalación en la UI
  btnInstalar.hidden = false;
});

// Desafío de Ensamblado 1: Programar click de #btn-instalar con .prompt() y .userChoice.then()
btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) {
    return;
  }

  eventoInstalacionDiferido.prompt();

  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      console.log('[PWA] Respuesta del usuario a la instalación:', resultado.outcome);
      if (resultado.outcome === 'accepted') {
        btnInstalar.hidden = true;
      }
    })
    .catch((error) => {
      console.error('[PWA] Error al procesar la solicitud de instalación:', error);
    })
    .finally(() => {
      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true;
  eventoInstalacionDiferido = null;
  console.log('[PWA] Aplicación instalada correctamente en el dispositivo.');
});

// Fragmento Auxiliar: Detección de iOS y Modo Instalado
function verificarEntornoIOS() {
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const estaInstalada = window.navigator.standalone === true ||
                        window.matchMedia('(display-mode: standalone)').matches;

  // Si está en iPhone y aún la ve desde el navegador, mostrar instrucciones manuales
  if (esIOS && !estaInstalada) {
    const guiaIOS = document.getElementById('instrucciones-ios');
    if (guiaIOS) guiaIOS.hidden = false;
  }
}

// Registro del Service Worker usando Promesas (.then / .catch / .finally)
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Este navegador no soporta Service Workers.');
    return;
  }

  navigator.serviceWorker.register('./sw.js')
    .then((registro) => {
      console.log('[PWA] Service Worker registrado con ámbito:', registro.scope);
    })
    .catch((error) => {
      console.error('[PWA] Error al registrar el Service Worker:', error);
    })
    .finally(() => {
      console.log('[PWA] Verificación de Service Worker completada.');
    });
}

// ============================================================================
// Fase 2: Flujo de Pre-Permiso y Control de Cámara (getUserMedia)
// ============================================================================

let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal

function actualizarMensajeEstado(texto) {
  if (mensajeEstado) {
    mensajeEstado.textContent = texto;
  }
  if (indicadorLed) {
    if (streamActual) {
      indicadorLed.classList.add('active');
    } else {
      indicadorLed.classList.remove('active');
    }
  }
}

// Fragmento C: Liberación de Hardware entre Cambios de Cámara
function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop();
    });
    streamActual = null;
  }
}

// Fragmento D: Encendido de Cámara con Promesas y Diagnóstico de Errores
function iniciarCamara(modo) {
  detenerCamaraActiva();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('API getUserMedia no disponible. Asegúrate de abrir la app bajo HTTPS.');
    return Promise.resolve();
  }

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  actualizarMensajeEstado('Inicializando sensor de cámara...');

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      const visor = document.getElementById('visor-camara');
      visor.srcObject = stream;
      actualizarMensajeEstado(`Cámara activa (${modo === 'environment' ? 'Trasera' : 'Frontal'})`);
    })
    .catch((error) => {
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    })
    .finally(() => {
      console.log(`[Cámara] Negociación de hardware finalizada (modo: ${modo}).`);
    });
}

// Fragmento E: Flujo de Consentimiento Previo (Pre-Permiso UX)
// Paso 1: El usuario pulsa "Solicitar Acceso a Cámara" -> Mostramos aviso explicativo
btnPrepararCamara.addEventListener('click', () => {
  if (lenteSolicitadoTexto) {
    lenteSolicitadoTexto.textContent = modoCamaraActual === 'environment'
      ? 'Cámara Trasera (environment)'
      : 'Cámara Frontal (user)';
  }
  avisoPermiso.hidden = false;
});

// Paso 2: El usuario lee el motivo y pulsa "Aceptar y Encender Cámara"
btnConfirmarPermiso.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

// Desafío de Ensamblado 2: Botón de Cambio de Cámara (#btn-alternar-camara)
btnAlternarCamara.addEventListener('click', () => {
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
  iniciarCamara(modoCamaraActual);
});

// Desafío de Ensamblado 2: Botón de Apagado (#btn-apagar-camara)
btnApagarCamara.addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  actualizarMensajeEstado('Cámara apagada. Flujo de video detenido.');
});

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  verificarEntornoIOS();
  registrarServiceWorker();
});
