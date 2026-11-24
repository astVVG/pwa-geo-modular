// app.js - Lógica de UI, pre-permiso y consumo del helper

// Registro del Service Worker
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