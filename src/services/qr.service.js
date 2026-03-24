import { randomUUID } from 'crypto';
import { pool } from '../db/pool.js';
import { config } from '../config/index.js';
import { verifyPaymentSignature } from './razorpay.service.js';

const RELATIONS = new Set(['Father', 'Mother', 'Sister', 'Brother', 'Other']);

export function validateFamilyRelation(relation) {
  return RELATIONS.has(relation);
}

// export async function createQrRecord({
//   userId,
//   razorpay_order_id,
//   razorpay_payment_id,
//   razorpay_signature,
//   name,
//   mobile,
//   email,
//   vehicle_number,
//   blood_group,
//   family,
// }) {
//   if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
//     const err = new Error('Invalid payment signature');
//     err.statusCode = 400;
//     throw err;
//   }

//   if (!family || !Array.isArray(family) || family.length < 1 || family.length > 5) {
//     const err = new Error('Family must include 1 to 5 contacts');
//     err.statusCode = 400;
//     throw err;
//   }

//   for (const f of family) {
//     if (!f.name || !f.phone || !f.relation || !validateFamilyRelation(f.relation)) {
//       const err = new Error('Each family member needs name, phone, and valid relation');
//       err.statusCode = 400;
//       throw err;
//     }
//   }

//   const uniqueId = randomUUID();
//   const vehicleNorm = String(vehicle_number).trim().toUpperCase();

//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
//     const qrRes = await client.query(
//       `INSERT INTO qrdata (user_id, unique_id, name, mobile, email, vehicle_number, blood_group)
//        VALUES ($1, $2, $3, $4, $5, $6, $7)
//        RETURNING *`,
//       [userId, uniqueId, name.trim(), mobile.trim(), email.trim(), vehicleNorm, blood_group || null]
//     );
//     const qr = qrRes.rows[0];
//     for (const f of family) {
//       await client.query(
//         `INSERT INTO family_details (qr_id, name, phone, relation) VALUES ($1, $2, $3, $4)`,
//         [qr.id, f.name.trim(), String(f.phone).replace(/\s/g, ''), f.relation]
//       );
//     }
//     await client.query('COMMIT');
//     const alertUrl = `${config.publicAppUrl}/alert/${uniqueId}`;
//     return { ...qr, alertUrl };
//   } catch (e) {
//     await client.query('ROLLBACK');
//     throw e;
//   } finally {
//     client.release();
//   }
// }

export async function createQrRecord({
  userId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  name,
  mobile,
  email,
  vehicle_number,
  blood_group,
  family,
}) {
  console.log("🚀 createQrRecord called");

  // 🔐 1. Payment verification (skip in dev)
  if (process.env.NODE_ENV !== 'development') {
    if (!verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    )) {
      const err = new Error('Invalid payment signature');
      err.statusCode = 400;
      throw err;
    }
  } else {
    console.log("⚠️ DEV MODE: Skipping payment verification");
  }

  // 🧾 2. Validate required fields
  if (!name || !mobile || !email || !vehicle_number) {
    throw new Error("Missing required fields");
  }

  if (!family || !Array.isArray(family) || family.length < 1 || family.length > 5) {
    throw new Error("Family must include 1 to 5 contacts");
  }

  for (const f of family) {
    if (!f || !f.name || !f.phone || !f.relation) {
      throw new Error("Invalid family member data");
    }

    if (!validateFamilyRelation(f.relation)) {
      throw new Error(`Invalid relation: ${f.relation}`);
    }
  }

  // 🧠 3. Normalize data
  const uniqueId = randomUUID();
  const vehicleNorm = String(vehicle_number).trim().toUpperCase();
  const nameNorm = name.trim();
  const mobileNorm = String(mobile).replace(/\s/g, '');
  const emailNorm = email.trim();

  console.log("📦 Data prepared:", {
    uniqueId,
    nameNorm,
    mobileNorm,
    emailNorm,
    vehicleNorm,
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 🧾 4. Insert QR record
    const qrRes = await client.query(
      `INSERT INTO qrdata 
        (user_id, unique_id, name, mobile, email, vehicle_number, blood_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId || null, // allow null in dev
        uniqueId,
        nameNorm,
        mobileNorm,
        emailNorm,
        vehicleNorm,
        blood_group || null,
      ]
    );

    console.log("🧾 QR INSERT RESULT:", qrRes.rows);

    const qr = qrRes.rows[0];

    if (!qr) {
      throw new Error("QR insert failed - no data returned");
    }

    // 👨‍👩‍👧 5. Insert family members
    for (const f of family) {
      console.log("📥 Inserting family:", f);

      await client.query(
        `INSERT INTO family_details 
          (qr_id, name, phone, relation)
         VALUES ($1, $2, $3, $4)`,
        [
          qr.id,
          f.name.trim(),
          String(f.phone).replace(/\s/g, ''),
          f.relation,
        ]
      );
    }

    await client.query('COMMIT');

    console.log("✅ QR + Family inserted successfully");

    // 🔗 6. Generate alert URL
    const alertUrl = `${config.publicAppUrl}/alert/${uniqueId}`;

    return {
      id: qr.id,
      unique_id: qr.unique_id,
      name: qr.name,
      mobile: qr.mobile,
      vehicle_number: qr.vehicle_number,
      blood_group: qr.blood_group,
      alert_url: alertUrl,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ DB ERROR:", err);
    throw err;
  } finally {
    client.release();
  }
}
export async function listHistoryForUser(userId) {
  const res = await pool.query(
    `SELECT q.id, q.unique_id, q.name, q.mobile, q.email, q.vehicle_number, q.blood_group, q.created_at,
            (SELECT COUNT(*)::int FROM family_details f WHERE f.qr_id = q.id) AS family_count
     FROM qrdata q
     WHERE q.user_id = $1
     ORDER BY q.created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function getQrByUniqueId(uniqueId) {
  const res = await pool.query(`SELECT * FROM qrdata WHERE unique_id = $1`, [uniqueId]);
  return res.rows[0] || null;
}

export async function getFamilyByQrId(qrId) {
  const res = await pool.query(
    `SELECT * FROM family_details WHERE qr_id = $1 ORDER BY id`,
    [qrId]
  );
  return res.rows;
}

export async function getFamilyMember(qrId, familyDetailId) {
  const res = await pool.query(
    `SELECT * FROM family_details WHERE qr_id = $1 AND id = $2`,
    [qrId, familyDetailId]
  );
  return res.rows[0] || null;
}
