/**
 * Lógica de la interfaz: explica al usuario por qué se pide la ubicación,
 * la obtiene con geo-helper.js, muestra su precisión y, si no se puede,
 * ofrece elegir la zona a mano.
 */

/** Registra el Service Worker al cargar la página para que la app funcione sin conexión. */
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

/** Guarda la última ubicación obtenida para reutilizarla al enviar el reporte sin volver a pedir el GPS. */
let ultimaUbicacion = null;

/** Muestra un aviso de carga y oculta el error y el resultado anteriores. */
function mostrarCargando(texto) {
    mensajeError.hidden = true;
    resultadoUbicacion.hidden = true;
    estadoCarga.textContent = texto;
    estadoCarga.hidden = false;
}

/** Oculta el aviso de carga. */
function ocultarCargando() {
    estadoCarga.hidden = true;
}

/** Quita el aviso de carga y muestra el mensaje de error recibido. */
function mostrarMensajeError(texto) {
    ocultarCargando();
    mensajeError.textContent = texto;
    mensajeError.hidden = false;
}

/** Muestra el selector para que el usuario elija su zona a mano (Plan B). */
function habilitarSelectorManualZona() {
    selectorManual.hidden = false;
}

/**
 * Guarda la ubicación recibida y la muestra en pantalla.
 * Si el margen de error es menor de 30 metros la marca como GPS de alta precisión;
 * si no, como ubicación aproximada por Wi-Fi o IP.
 */
function renderizarResultadoUbicacion(ubicacion) {
    ultimaUbicacion = ubicacion;
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

/**
 * Ejemplo 1 del enunciado: pide coordenadas frescas y las une a los datos del reporte.
 * Si no se consiguen, muestra el motivo y abre el selector manual sin bloquear al usuario.
 */
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
            habilitarSelectorManualZona();
        });
}

/**
 * Ejemplo 2 del enunciado: lectura rápida y de baja precisión para buscar sucursales cercanas.
 * No está conectada a la interfaz; solo muestra que el helper se puede reutilizar.
 */
function buscarSucursalesCercanas() {
    return obtenerUbicacionActual({ enableHighAccuracy: false, maximumAge: 60000 })
        .then((ubicacion) => {
            console.log(`Filtrando sucursales cerca de ${ubicacion.latitud}, ${ubicacion.longitud}`);
        });
}

/**
 * Pide la ubicación real y la muestra; si falla, explica el motivo y abre el selector manual.
 * Solo se llama tras un clic del usuario, porque Safari en iPhone ignora las peticiones automáticas.
 */
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
            habilitarSelectorManualZona();
        });
}

/**
 * Botón "Adjuntar mi ubicación": decide qué hacer según el permiso actual.
 * 1. Si ya está permitido, lee la ubicación directamente.
 * 2. Si aún no se ha preguntado, muestra la tarjeta que explica por qué se necesita.
 * 3. Si está bloqueado, abre el selector manual y explica cómo reactivarlo.
 */
btnAdjuntar.addEventListener('click', () => {
    mensajeError.hidden = true;
    resultadoUbicacion.hidden = true;

    consultarEstadoPermisoGeo().then((estado) => {
        if (estado === 'granted') {
            leerUbicacion();
        } else if (estado === 'prompt') {
            tarjetaPrePermiso.hidden = false;
        } else {
            ayudaPermiso.hidden = false;
            habilitarSelectorManualZona();
        }
    });
});

/** Botón "Compartir mi ubicación": tras leer la explicación, el usuario acepta y se pide la ubicación. */
btnConfirmar.addEventListener('click', () => {
    leerUbicacion();
});

/** Botón "Ahora no": cierra la explicación y ofrece elegir la zona a mano. */
btnCancelar.addEventListener('click', () => {
    tarjetaPrePermiso.hidden = true;
    habilitarSelectorManualZona();
});

/**
 * Envía el reporte con la mejor ubicación disponible, en este orden:
 * 1. La última ubicación ya obtenida.
 * 2. La zona elegida a mano.
 * 3. Una lectura nueva solo si el permiso ya está dado; si no, pide al usuario una de las dos.
 */
formReporte.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const datosFormulario = {
        descripcion: document.getElementById('descripcion').value.trim()
    };

    if (ultimaUbicacion) {
        const paqueteCompleto = Object.assign({}, datosFormulario, {
            coordenadas: ultimaUbicacion
        });
        console.log('Paquete listo para enviar o encolar en IndexedDB:', paqueteCompleto);
        return;
    }

    if (zonaManual.value) {
        const paqueteManual = Object.assign({}, datosFormulario, {
            zonaManual: zonaManual.value
        });
        console.log('Paquete con zona manual:', paqueteManual);
        return;
    }

    consultarEstadoPermisoGeo().then((estado) => {
        if (estado === 'granted') {
            return enviarReporteConUbicacion(datosFormulario);
        }

        mostrarMensajeError('Adjunta tu ubicación o elige una zona antes de enviar el reporte.');
        habilitarSelectorManualZona();
    });
});