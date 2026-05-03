// ============================================================
// Solmedix — Agente IA WhatsApp (Sofía)
// index.js — Servidor principal / Webhook
// ============================================================

const express = require('express');
const axios = require('axios');
const { procesarMensaje } = require('./sofia');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
const GUPSHUP_NUMBER = process.env.GUPSHUP_NUMBER; // 5215516609658

// ── Zona horaria Monterrey ──────────────────────────────────
function horaMonterrey() {
  return new Date().toLocaleString('en-US', { timeZone: 'America/Monterrey' });
}

function dentroDeVentanaActiva() {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Monterrey' }));
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const totalMinutos = hora * 60 + minutos;
  // Ventana activa: 8:00 am (480) a 9:00 pm (1260)
  return totalMinutos >= 480 && totalMinutos <= 1260;
}

function dentroDeHorarioComercial() {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Monterrey' }));
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const diaSemana = ahora.getDay(); // 0=Dom, 1=Lun ... 6=Sab
  const totalMinutos = hora * 60 + minutos;

  if (diaSemana >= 1 && diaSemana <= 5) {
    // Lunes a viernes: 9am-7pm
    return totalMinutos >= 540 && totalMinutos <= 1140;
  } else if (diaSemana === 6) {
    // Sábado: 10am-5pm
    return totalMinutos >= 600 && totalMinutos <= 1020;
  } else {
    // Domingo: cerrado
    return false;
  }
}

// ── Enviar mensaje por Gupshup ─────────────────────────────
async function enviarMensaje(numero, texto) {
  try {
    await axios.post(
      'https://api.gupshup.io/wa/api/v1/msg',
      new URLSearchParams({
        channel: 'whatsapp',
        source: GUPSHUP_NUMBER,
        destination: numero,
        message: JSON.stringify({ type: 'text', text: texto }),
        'src.name': 'Solmedix'
      }),
      {
        headers: {
          'apikey': GUPSHUP_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    console.log(`[ENVIADO] → ${numero}: ${texto.substring(0, 60)}...`);
  } catch (err) {
    console.error('[ERROR enviarMensaje]', err.response?.data || err.message);
  }
}

// ── Webhook principal ───────────────────────────────────────
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Responder inmediato a Gupshup

  try {
    const payload = req.body;

    // Validar que sea un mensaje entrante
    if (!payload || payload.type !== 'message') return;

    const mensaje = payload.payload;
    if (!mensaje || mensaje.type !== 'text') return;

    const textoCliente = mensaje.payload?.text?.trim();
    const numeroCliente = mensaje.sender?.phone;

    if (!textoCliente || !numeroCliente) return;

    console.log(`[RECIBIDO] ${numeroCliente}: ${textoCliente}`);

    // ── Silencio total fuera de ventana activa ──
    if (!dentroDeVentanaActiva()) {
      console.log('[SILENCIO TOTAL] Fuera de horario — no se responde');
      return;
    }

    // ── Número especial: SLP ────────────────────
    if (numeroCliente === '524444433070' || numeroCliente === '4444433070') {
      await enviarMensaje(numeroCliente, 'Recibido, con gusto se hace llegar tu mensaje.');
      // Reenviar a Alfredo
      await enviarMensaje(
        process.env.NUMERO_ALFREDO,
        `MENSAJE DE SLP — 444 443 3070:\n\n${textoCliente}`
      );
      return;
    }

    // ── Procesar con Sofía ──────────────────────
    const fuera = !dentroDeHorarioComercial();
    const respuesta = await procesarMensaje(numeroCliente, textoCliente, fuera);

    if (respuesta) {
      await enviarMensaje(numeroCliente, respuesta);
    }

  } catch (err) {
    console.error('[ERROR webhook]', err.message);
  }
});

// ── Health check ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'Sofía activa',
    hora_monterrey: horaMonterrey(),
    ventana_activa: dentroDeVentanaActiva(),
    horario_comercial: dentroDeHorarioComercial()
  });
});

app.listen(PORT, () => {
  console.log(`[SOFÍA] Servidor activo en puerto ${PORT}`);
  console.log(`[SOFÍA] Hora Monterrey: ${horaMonterrey()}`);
});
