const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./firebase-key.json');

// Inicializamos Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const datosLocales = JSON.parse(fs.readFileSync('./datos.json', 'utf8'));

async function migrarALaNube() {
    try {
        // Creamos una colección llamada 'quiniela' y un documento llamado 'datos'
        await db.collection('quiniela').doc('datos').set(datosLocales);
        console.log("✅ ¡Tu base de datos ha sido migrada a Firebase con éxito!");
        process.exit();
    } catch (error) {
        console.error("Error al subir:", error);
    }
}

migrarALaNube();