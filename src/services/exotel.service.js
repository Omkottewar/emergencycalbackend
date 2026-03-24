import { config } from '../config/index.js';

/**
 * Exotel connect two parties with masking (demo: logs and returns mock call sid).
 * Docs: https://developer.exotel.com/api/voice
 */export async function initiateMaskedCall({ from, to, qrId }) {
  const { sid, apiKey, apiToken, callerId } = config.exotel;

  console.log("EXOTEL CONFIG:", { sid, apiKey, callerId, from, to, qrId , apiToken});

  if (!sid || !apiKey || !apiToken || !callerId) {
    return {
      ok: true,
      mock: true,
      message: 'Exotel credentials not set — mock call accepted',
    };
  }

  const url = `https://api.exotel.com/v1/Accounts/${sid}/Calls/connect.json`;

  const auth = Buffer.from(`${apiKey}:${apiToken}`).toString('base64');

  const params = new URLSearchParams({
    From: from,
    To: to,
    CallerId: callerId,
    CallType: 'trans',
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: params.toString(),
    });

    const text = await res.text();
    console.log("EXOTEL RESPONSE:", text);

    if (!res.ok) {
      return {
        ok: false,
        error: text,
        status: res.status,
      };
    }

    return { ok: true, raw: text };

  } catch (e) {
    return { ok: false, error: String(e.message) };
  }
}