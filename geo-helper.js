/**
 * Módulo reutilizable de geolocalización. Envuelve la API de navigator.geolocation,
 * que funciona con callbacks, en Promesas para que cualquier parte de la app
 * pueda pedir la ubicación con .then() y .catch().
 */

/**
 * Convierte el error técnico que devuelve el navegador en un mensaje claro
 * para el usuario, según si negó el permiso, no hubo señal o se agotó el tiempo.
 */
function traducirErrorGeolocalizacion(error) {
    switch (error.code) {
        case 1:
            return 'Permiso de ubicación denegado. Puedes ingresar tu zona manualmente.';
        case 2:
            return 'No fue posible determinar tu ubicación (señal GPS o Wi-Fi no disponible).';
        case 3:
            return 'Se agotó el tiempo de espera intentando obtener las coordenadas.';
        default:
            return 'Ocurrió un error inesperado al consultar la ubicación.';
    }
}

/**
 * Pide la posición actual una sola vez y la devuelve como Promesa.
 * 1. Usa alta precisión por defecto, pero permite cambiar las opciones al llamarla.
 * 2. Si el navegador no soporta geolocalización, rechaza de inmediato.
 * 3. Si todo va bien, entrega latitud, longitud, precisión y hora; si falla, el error traducido.
 */
function obtenerUbicacionActual(opcionesPersonalizadas) {
    const opciones = Object.assign(
        {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 30000
        },
        opcionesPersonalizadas
    );

    return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
            reject(new Error('Este navegador no soporta la API de Geolocalización.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                resolve({
                    latitud: posicion.coords.latitude,
                    longitud: posicion.coords.longitude,
                    precisionMetros: Math.round(posicion.coords.accuracy),
                    timestamp: posicion.timestamp
                });
            },
            (error) => {
                reject(new Error(traducirErrorGeolocalizacion(error)));
            },
            opciones
        );
    });
}

/**
 * Averigua si el usuario ya permitió o bloqueó la ubicación antes de pedirla.
 * Si el navegador no permite consultarlo, asume que aún no ha decidido,
 * para que la app siga funcionando.
 */
function consultarEstadoPermisoGeo() {
    if (!('permissions' in navigator)) {
        return Promise.resolve('prompt');
    }

    return navigator.permissions.query({ name: 'geolocation' })
        .then((resultado) => resultado.state)
        .catch(() => 'prompt');
}