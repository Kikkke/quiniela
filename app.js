const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const admin = require('firebase-admin');

// --- CONEXIÓN A FIREBASE ---
const serviceAccount = require('./firebase-key.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CREDENCIALES DE SOFASCORE ---
const API_KEY = 'b21ca1f0c4msh95b3eab7f6e6923p15b91djsn01470d8a675a';
const API_HOST = 'sportapi7.p.rapidapi.com';

// --- NUEVAS FUNCIONES DE LECTURA/ESCRITURA EN LA NUBE ---
async function leerDatos() {
    const doc = await db.collection('quiniela').doc('datos').get();
    return doc.exists ? doc.data() : { participantes: [] };
}

async function guardarDatos(datosActualizados) {
    await db.collection('quiniela').doc('datos').set(datosActualizados);
}

async function leerHistorial() {
    const doc = await db.collection('quiniela').doc('historial').get();
    return doc.exists ? doc.data().procesados : [];
}

async function guardarHistorial(nuevoHistorial) {
    await db.collection('quiniela').doc('historial').set({ procesados: nuevoHistorial });
}

// --- FUNCIÓN PRINCIPAL ---
async function consultarPartidosDeHoy() {
    try {
        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
        
        const opciones = {
            method: 'GET',
            url: `https://${API_HOST}/api/v1/sport/football/scheduled-events/${hoy}`,
            headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST }
        };

        const respuesta = await axios.request(opciones);
        const eventos = respuesta.data.events;
        
        if (!eventos) return 0;

        // Descargamos la base de datos de Firebase
        const datos = await leerDatos();
        let historial = await leerHistorial();
        
        let seleccionesActualizadas = 0;

        eventos.forEach(evento => {
            if (historial.includes(evento.id)) return;

            if (!evento.homeTeam || !evento.awayTeam) return;
            const local = evento.homeTeam.name;
            const visitante = evento.awayTeam.name;
            const estado = evento.status?.type;

            const nombreTorneo = evento.tournament?.name || "";
            const nombreCategoria = evento.tournament?.category?.name || "";

            const esMundial = nombreTorneo.includes("World Cup") || nombreCategoria.includes("World Cup");
            const esAmistoso = nombreTorneo.includes("Friendly") || nombreCategoria.includes("Friendly");

            if (estado === 'finished' && esMundial && !esAmistoso) {
                
                const golesLocal = evento.homeScore?.normaltime ?? evento.homeScore?.period2 ?? evento.homeScore?.current ?? 0;
                const golesVisitante = evento.awayScore?.normaltime ?? evento.awayScore?.period2 ?? evento.awayScore?.current ?? 0;
                
                let ganador = (golesLocal > golesVisitante) ? local : (golesVisitante > golesLocal) ? visitante : 'empate';

                console.log(`🏆 ¡Partido terminado (90 min)!: ${local} ${golesLocal} - ${golesVisitante} ${visitante}`);

                if (datos.participantes) {
                    datos.participantes.forEach(p => {
                        p.equipos.forEach(e => {
                            if (e.nombre === local || e.nombre === visitante) {
                                if (ganador === 'empate') {
                                    e.puntos += 1;
                                    console.log(`   ➔ +1 punto a ${e.nombre}`);
                                } else if (ganador === e.nombre) {
                                    e.puntos += 3;
                                    console.log(`   ➔ +3 puntos a ${e.nombre}`);
                                }
                                seleccionesActualizadas++;
                            }
                        });
                    });
                }
                historial.push(evento.id);
            }
        });

        if (seleccionesActualizadas > 0) {
            // Guardamos los puntos de vuelta a Firebase
            await guardarDatos(datos);
            await guardarHistorial(historial);
            console.log(`✅ Firebase actualizado. Se modificaron ${seleccionesActualizadas} selecciones.`);
        } else {
            console.log('No hubo cambios en Firebase esta vez.');
        }

        return seleccionesActualizadas; 

    } catch (error) {
        console.error('Error:', error.message);
        return -1; 
    }
}

app.use(express.static('public'));

io.on('connection', async (socket) => {
    // Alguien entra a la página -> Le mandamos los datos frescos de Firebase
    const datosIniciales = await leerDatos();
    socket.emit('actualizacionDatos', datosIniciales);

    socket.on('forzarActualizacion', async () => {
        const cambios = await consultarPartidosDeHoy(); 
        
        // Repartimos la base de datos actualizada a todos los conectados
        const datosNuevos = await leerDatos();
        io.emit('actualizacionDatos', datosNuevos); 

        if (cambios === 0) {
            socket.emit('mensajeStatus', 'No se encontraron nuevos partidos finalizados en esta actualización.');
        } else if (cambios > 0) {
            socket.emit('mensajeStatus', `¡Se actualizaron ${cambios} selecciones en el marcador con éxito!`);
        } else {
            socket.emit('mensajeStatus', 'Hubo un error al conectar con la API.');
        }
    });
});

// Render y Heroku te inyectan el puerto por defecto, por eso agregamos process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));