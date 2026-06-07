const socket = io();

// Referencias a los elementos del HTML
const bodyPosiciones = document.getElementById('body-posiciones');
const bodyEquipos = document.getElementById('body-equipos');
const estadoConexion = document.getElementById('estado-conexion');

// Cambiar el mensajito superior cuando nos conectamos
socket.on('connect', () => {
    estadoConexion.textContent = '🟢 Conectado en tiempo real';
    estadoConexion.className = 'conectado';
});
// Escucha el mensaje de estatus que manda el servidor
socket.on('mensajeStatus', (mensaje) => {
    // Usamos un alert clásico de JavaScript por ahora para probar
    alert(mensaje); 
});

// Cambiar el mensajito si se cae el servidor
socket.on('disconnect', () => {
    estadoConexion.textContent = '🔴 Desconectado del servidor';
    estadoConexion.className = 'desconectado';
});

// Escuchar los datos que nos manda tu servidor Node (datos.json)
socket.on('actualizacionDatos', (datos) => {
    renderizarTablas(datos.participantes);
});

// Funcionalidad del botón actualizar
const btnActualizar = document.getElementById('btn-actualizar');
const iconoRefresh = document.getElementById('icono-refresh');

btnActualizar.addEventListener('click', () => {
    // 1. Animamos el icono para que dé vueltas
    iconoRefresh.classList.add('girar');
    setTimeout(() => {
        iconoRefresh.classList.remove('girar');
    }, 1000); // La animación dura 1 segundo

    // 2. Le pedimos al backend que recalcule todo
    socket.emit('forzarActualizacion');
});

function renderizarTablas(participantes) {
    // 1. Limpiamos las tablas antes de escribir
    bodyPosiciones.innerHTML = '';
    bodyEquipos.innerHTML = '';

    // --- TABLA 1: POSICIONES ---
    // Clonamos y calculamos los puntos totales de cada quien
    const participantesOrdenados = [...participantes].map(p => {
        // Sumamos los puntos de sus 6 equipos
        const puntosTotales = p.equipos.reduce((suma, equipo) => suma + equipo.puntos, 0);
        return { nombre: p.nombre, puntosTotales: puntosTotales };
    });

    // Ordenamos de mayor a menor puntaje
    participantesOrdenados.sort((a, b) => b.puntosTotales - a.puntosTotales);

    participantesOrdenados.forEach((p, index) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><strong>#${index + 1}</strong></td>
            <td>${p.nombre}</td>
            <td><strong>${p.puntosTotales}</strong></td>
        `;
        bodyPosiciones.appendChild(fila);
    });

    // --- TABLA 2: ESTADO DE EQUIPOS ---
    // Mantenemos el orden original (o podrías ordenarlo alfabéticamente si quieres)
    participantes.forEach(p => {
        const fila = document.createElement('tr');
        
        // Creamos las "etiquetas" para cada equipo
        const badgesHtml = p.equipos.map(equipo => {
            // Si en el JSON dice eliminado: true, le pone la clase para tacharlo
            const claseEliminado = equipo.eliminado ? 'equipo-eliminado' : 'equipo-badge';
            return `<span class="${claseEliminado}">${equipo.nombre} (${equipo.puntos} pts)</span>`;
        }).join('');

        fila.innerHTML = `
            <td><strong>${p.nombre}</strong></td>
            <td>${badgesHtml}</td>
        `;
        bodyEquipos.appendChild(fila);
    });
}