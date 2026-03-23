import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';
import { maskFullName, maskMobile } from '../utils/mask.js';
import {
  getFamilyByQrId,
  getFamilyMember,
  getQrByUniqueId,
} from '../services/qr.service.js';
import { initiateMaskedCall } from '../services/exotel.service.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

function loadAlertPageHtml() {
  try {
    return readFileSync(path.join(__dirname, '../public/alert-page.html'), 'utf8');
  } catch {
    return '<!DOCTYPE html><html><body><p>Alert page missing</p></body></html>';
  }
}

router.post(
  '/call',
  body('uniqueId').notEmpty(),
  body('vehicle_number').trim().notEmpty(),
  body('caller_number').trim().notEmpty(),
  body('target').isIn(['owner', 'family']),
  body('family_detail_id').optional().isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { uniqueId, vehicle_number, caller_number, target, family_detail_id } = req.body;
    const qr = await getQrByUniqueId(uniqueId);
    if (!qr) {
      return res.status(404).json({ error: 'QR not found' });
    }
    const vehicleNorm = String(vehicle_number).trim().toUpperCase();
    if (qr.vehicle_number !== vehicleNorm) {
      return res.status(403).json({ error: 'Vehicle number does not match' });
    }

    let receiverNumber;
    if (target === 'owner') {
      receiverNumber = qr.mobile;
    } else {
      if (!family_detail_id) {
        return res.status(400).json({ error: 'family_detail_id required for family target' });
      }
      const member = await getFamilyMember(qr.id, family_detail_id);
      if (!member) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      receiverNumber = member.phone;
    }

    const callResult = await initiateMaskedCall({
      from: caller_number,
      to: receiverNumber,
      qrId: qr.id,
    });

    await pool.query(
      `INSERT INTO alert_logs (qr_id, caller_number, receiver_number) VALUES ($1, $2, $3)`,
      [qr.id, caller_number, receiverNumber]
    );

    return res.json({
      ok: true,
      call: callResult,
      message: callResult.mock
        ? 'Call request logged (Exotel mock)'
        : 'Call initiated',
    });
  }
);

router.post(
  '/:uniqueId/verify',
  body('vehicle_number').trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { uniqueId } = req.params;
    const vehicleNorm = String(req.body.vehicle_number).trim().toUpperCase();
    const qr = await getQrByUniqueId(uniqueId);
    if (!qr) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (qr.vehicle_number !== vehicleNorm) {
      return res.status(400).json({ error: 'Vehicle number does not match our records' });
    }

    const family = await getFamilyByQrId(qr.id);
    return res.json({
      verified: true,
      owner: {
        nameMasked: maskFullName(qr.name),
        mobileMasked: maskMobile(qr.mobile),
      },
      family: family.map((f) => ({
        id: f.id,
        relation: f.relation,
        name: f.name,
        phoneMasked: maskMobile(f.phone),
      })),
    });
  }
);

router.get('/:uniqueId', (req, res) => {
  const html = loadAlertPageHtml().replaceAll('__UNIQUE_ID__', req.params.uniqueId);
  res.type('html').send(html);
});

export default router;
