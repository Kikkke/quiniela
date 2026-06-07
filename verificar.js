const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ ¡La llave es válida y Firebase se inicializó!");
    const db = admin.firestore();
    console.log("✅ Conectado a Firestore con éxito.");
} catch (error) {
    console.error("❌ Error al inicializar:", error.message);
}