// ============================================================
// Solmedix — Agente IA WhatsApp (Sofía)
// sheets.js — Conexión a Google Sheets POS (inventario)
// ============================================================

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; // ID del sheet de Solmedix POS
const RANGO_INVENTARIO = 'Inventario!A2:F500'; // Ajustar según estructura real del sheet

// ── Autenticación con Google ────────────────────────────────
async function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  return auth;
}

// ── Consultar inventario en tiempo real ─────────────────────
async function consultarInventario() {
  try {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGO_INVENTARIO
    });

    const filas = response.data.values || [];

    // Mapear filas a objetos de medicamento
    // Estructura esperada: [nombre, presentacion, precio, existencia, clave, ...]
    const inventario = filas
      .filter(fila => fila[0] && fila[2]) // Debe tener nombre y precio
      .map(fila => ({
        nombre: fila[0] || '',
        presentacion: fila[1] || '',
        precio: parseFloat(fila[2]?.replace(/[^0-9.]/g, '')) || 0,
        existencia: parseInt(fila[3]) || 0,
        clave: fila[4] || ''
      }))
      .filter(m => m.nombre && m.precio > 0);

    console.log(`[SHEETS] Inventario cargado: ${inventario.length} productos`);
    return inventario;

  } catch (err) {
    console.error('[SHEETS ERROR]', err.message);
    throw err;
  }
}

// ── Buscar medicamento específico ───────────────────────────
async function buscarMedicamento(nombreBusqueda) {
  const inventario = await consultarInventario();
  const busqueda = nombreBusqueda.toLowerCase();

  return inventario.filter(m =>
    m.nombre.toLowerCase().includes(busqueda) ||
    m.presentacion.toLowerCase().includes(busqueda)
  );
}

// ── Registrar en lista de espera ────────────────────────────
async function registrarListaEspera(nombre, numero, producto) {
  try {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const fecha = new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'ListaEspera!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[nombre, numero, producto, fecha]]
      }
    });

    console.log(`[SHEETS] Lista espera: ${nombre} — ${producto}`);
  } catch (err) {
    console.error('[SHEETS ERROR lista espera]', err.message);
  }
}

module.exports = { consultarInventario, buscarMedicamento, registrarListaEspera };
