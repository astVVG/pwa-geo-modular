// app.js - Lógica de UI, pre-permiso y consumo del helper

// ---------------------------------------------------------------
// 1. Registro del Service Worker
// ---------------------------------------------------------------
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registro) => {
                console.log('[SW] Registrado con scope:', registro.scope);
            })
            .catch((error) => {
                console.error('[SW] Error al registrar:', error);
            });
    });
}

// ---------------------------------------------------------------
// 2. Referencias al DOM
// ---------------------------------------------------------------
const btnAdjuntar = document.getElementById('btn-adjuntar-ubicacion');
const btnConfirmar = document.getElementById('btn-confirmar-ubicacion');
const btnCancelar = document.getElementById('btn-cancelar-ubicacion');
const tarjetaPrePermiso = document.getElementById('tarjeta-prepermiso');
const estadoCarga = document.getElementById('estado-carga');
const mensajeError = document.getElementById('mensaje-error');
const resultadoUbicacion = document.getElementById('resultado-ubicacion');
const etiquetaPrecision = document.getElementById('etiqueta-precision');
const selectorManual = document.getElementById('selector-manual');
const ayudaPermiso = document.getElementById('ayuda-permiso');
const zonaManual = document.getElementById('zona-manual');
const formReporte = document.getElementById('form-reporte');

// ---------------------------------------------------------------
// 3. Helpers de UI (consumidos por el Fragmento C)
// ---------------------------------------------------------------
function mostrarCargando(texto) {
    mensajeError.hidden = true;
    resultadoUbicacion.hidden = true;
    estadoCarga.textContent = texto;
    estadoCarga.hidden = false;
}

function ocultarCargando() {
    estadoCarga.hidden = true;
}

function mostrarMensajeError(texto) {
    ocultarCargando();
    mensajeError.textContent = texto;
    mensajeError.hidden = false;
}

function habilitarSelectorManualZona() {
    selectorManual.hidden = false;
}

// Indicador de calidad de señal: < 30 m = GPS alto, >= 30 m = aproximada
function renderizarResultadoUbicacion(ubicacion) {
    ocultarCargando();
    mensajeError.hidden = true;
    selectorManual.hidden = true;
    tarjetaPrePermiso.hidden = true;

    document.getElementById('dato-latitud').textContent = ubicacion.latitud.toFixed(6);
    document.getElementById('dato-longitud').textContent = ubicacion.longitud.toFixed(6);
    document.getElementById('dato-precision').textContent = ubicacion.precisionMetros + ' m';
    document.getElementById('dato-timestamp').textContent =
        new Date(ubicacion.timestamp).toLocaleString('es-MX');

    if (ubicacion.precisionMetros < 30) {
        etiquetaPrecision.textContent = 'Precisión GPS Alta';
        etiquetaPrecision.className = 'etiqueta etiqueta--alta';
    } else {
        etiquetaPrecision.textContent = 'Ubicación Aproximada (Wi-Fi / IP)';
        etiquetaPrecision.className = 'etiqueta etiqueta--aproximada';
    }

    resultadoUbicacion.hidden = false;
}

// ---------------------------------------------------------------
// 4. Fragmento C: Reutilización desde múltiples funciones
// ---------------------------------------------------------------

// Ejemplo de uso 1: Adjuntar coordenadas al enviar un reporte técnico
function enviarReporteConUbicacion(datosFormulario) {
    mostrarCargando('Obteniendo coordenadas...');

    return obtenerUbicacionActual({ enableHighAccuracy: true, timeout: 7000 })
        .then((ubicacion) => {
            const paqueteCompleto = Object.assign({}, datosFormulario, {
                coordenadas: ubicacion
            });
            console.log('Paquete listo para enviar o encolar en IndexedDB:', paqueteCompleto);
            renderizarResultadoUbicacion(ubicacion);
        })
        .catch((error) => {
            console.warn('[Geo] Fallback activado:', error.message);
            mostrarMensajeError(error.message);
            habilitarSelectorManualZona(); // Plan B sin bloquear al usuario
        });
}

// Ejemplo de uso 2: Lectura rápida de baja precisión para filtrar sucursales cercanas
function buscarSucursalesCercanas() {
    return obtenerUbicacionActual({ enableHighAccuracy: false, maximumAge: 60000 })
        .then((ubicacion) => {
            console.log(`Filtrando sucursales cerca de ${ubicacion.latitud}, ${ubicacion.longitud}`);
        });
}

// ---------------------------------------------------------------
// 5. Flujo de Pre-Permiso (botón "Adjuntar mi ubicación")
// ---------------------------------------------------------------

// Lectura real: solo se invoca desde un click del usuario (regla de iOS)
function leerUbicacion() {
    tarjetaPrePermiso.hidden = true;
    mostrarCargando('Obteniendo coordenadas...');

    return obtenerUbicacionActual()
        .then((ubicacion) => {
            renderizarResultadoUbicacion(ubicacion);
        })
        .catch((error) => {
            console.warn('[Geo] Fallback activado:', error.message);
            mostrarMensajeError(error.message);
            habilitarSelectorManualZona(); // Plan B sin bloquear al usuario
        });
}

btnAdjuntar.addEventListener('click', () => {
    mensajeError.hidden = true;
    resultadoUbicacion.hidden = true;

    consultarEstadoPermisoGeo().then((estado) => {
        if (estado === 'granted') {
            // Ya tiene permiso: lectura directa
            leerUbicacion();
        } else if (estado === 'prompt') {
            // Explicación contextual antes del diálogo nativo
            tarjetaPrePermiso.hidden = false;
        } else {
            // 'denied': Plan B inmediato e instrucciones para reactivar
            ayudaPermiso.hidden = false;
            habilitarSelectorManualZona();
        }
    });
});

btnConfirmar.addEventListener('click', () => {
    leerUbicacion();
});

btnCancelar.addEventListener('click', () => {
    tarjetaPrePermiso.hidden = true;
    habilitarSelectorManualZona();
});

// ---------------------------------------------------------------
// 6. Envío del formulario de reporte
// ---------------------------------------------------------------
formReporte.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const datosFormulario = {
        descripcion: document.getElementById('descripcion').value.trim()
    };

    // No se dispara el diálogo nativo desde aquí: solo se lee si ya hay permiso
    consultarEstadoPermisoGeo().then((estado) => {
        if (estado === 'granted') {
            return enviarReporteConUbicacion(datosFormulario);
        }

        if (zonaManual.value) {
            // Plan B: se envía con la zona elegida manualmente
            const paqueteManual = Object.assign({}, datosFormulario, {
                zonaManual: zonaManual.value
            });
            console.log('Paquete con zona manual:', paqueteManual);
            return;
        }

        mostrarMensajeError('Adjunta tu ubicación o elige una zona antes de enviar el reporte.');
        habilitarSelectorManualZona();
    });
});