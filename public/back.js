const socket = io();

const bodyPosiciones = document.getElementById('body-posiciones');
const bodyEquipos = document.getElementById('body-equipos');
const estadoConexion = document.getElementById('estado-conexion');

socket.on('connect', () => {
    estadoConexion.textContent = '● Conectado en tiempo real';
    estadoConexion.className = 'conectado';
});

socket.on('mensajeStatus', (mensaje) => {
    mostrarToast(mensaje);
});

socket.on('disconnect', () => {
    estadoConexion.textContent = '● Desconectado del servidor';
    estadoConexion.className = 'desconectado';
});

socket.on('actualizacionDatos', (datos) => {
    renderizarTablas(datos.participantes);
});

const btnActualizar = document.getElementById('btn-actualizar');
const iconoRefresh = document.getElementById('icono-refresh');

btnActualizar.addEventListener('click', () => {
    iconoRefresh.classList.add('girar');
    setTimeout(() => {
        iconoRefresh.classList.remove('girar');
    }, 1000);
    socket.emit('forzarActualizacion');
});

function renderizarTablas(participantes) {
    bodyPosiciones.innerHTML = '';
    bodyEquipos.innerHTML = '';

    // --- TABLA 1: POSICIONES ---
    const participantesOrdenados = [...participantes].map(p => {
        const puntosTotales = p.equipos.reduce((suma, equipo) => suma + equipo.puntos, 0);
        return { nombre: p.nombre, puntosTotales };
    });

    participantesOrdenados.sort((a, b) => b.puntosTotales - a.puntosTotales);

    participantesOrdenados.forEach((p, index) => {
        const fila = document.createElement('tr');

        let rankHtml;
        if (index === 0) rankHtml = `<span class="rank-1">🏆</span>`;
        else if (index === 1) rankHtml = `<span class="rank-2">#2</span>`;
        else if (index === 2) rankHtml = `<span class="rank-3">#3</span>`;
        else rankHtml = `<span class="rank-other">#${index + 1}</span>`;

        fila.innerHTML = `
            <td>${rankHtml}</td>
            <td><span class="nombre-participante">${p.nombre}</span></td>
            <td><span class="puntos-total">${p.puntosTotales}</span></td>
        `;
        bodyPosiciones.appendChild(fila);
    });

    // --- TABLA 2: ESTADO DE EQUIPOS ---
    participantes.forEach(p => {
        const fila = document.createElement('tr');

        const badgesHtml = p.equipos.map(equipo => {
            const claseEliminado = equipo.eliminado ? 'equipo-eliminado' : 'equipo-badge';
            return `<span class="${claseEliminado}">${equipo.nombre} (${equipo.puntos} pts)</span>`;
        }).join('');

        fila.innerHTML = `
            <td><span class="nombre-participante">${p.nombre}</span></td>
            <td>${badgesHtml}</td>
        `;
        bodyEquipos.appendChild(fila);
    });
}

// --- TOAST en lugar de alert ---
function mostrarToast(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}