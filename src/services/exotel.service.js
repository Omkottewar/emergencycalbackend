import { config } from '../config/index.js';

/**
 * Exotel connect two parties with masking (demo: logs and returns mock call sid).
 * Docs: https://developer.exotel.com/api/voice
 */
export async function initiateMaskedCall({ from, to, qrId }) {
  const { sid, token, callerId } = config.exotel;
  if (!sid || !token || !callerId) {
    return {
      ok: true,
      mock: true,
      message: 'Exotel credentials not set — mock call accepted',
      callSid: `MOCK_${Date.now()}`,
    };
  }

  const url = `https://${sid}:${token}@api.exotel.com/v1/Accounts/${sid}/Calls/connect.json`;
  const params = new URLSearchParams({
    From: from,
    To: to,
    CallerId: callerId,
    CallType: 'trans',
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        mock: false,
        error: text,
        status: res.status,
      };
    }
    return { ok: true, mock: false, raw: text };
  } catch (e) {
    return { ok: false, mock: false, error: String(e.message) };
  }
}
