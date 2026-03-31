import { randomUUID } from 'crypto';
import { pool } from '../db/pool.js';
import { config } from '../config/index.js';
import { verifyPaymentSignature } from './razorpay.service.js';

const RELATIONS = new Set(['Father', 'Mother', 'Sister', 'Brother', 'Other']);

export function validateFamilyRelation(relation) {
  return RELATIONS.has(relation);
}
export async function createQrRecord(data){

 const {
  userId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  name,
  mobile,
  email,
  vehicle_number,
  blood_group,
  family
 } = data;

 // 1 Verify signature
 if(!verifyPaymentSignature(
     razorpay_order_id,
     razorpay_payment_id,
     razorpay_signature
  )){
   throw new Error("Invalid payment signature")
 }

 // 2 Verify payment from Razorpay API
 const payment = await razorpay.payments.fetch(razorpay_payment_id)

 if(payment.status !== "captured"){
   throw new Error("Payment not completed")
 }

 if(payment.order_id !== razorpay_order_id){
   throw new Error("Order mismatch")
 }

 // 3 Normalize data
 const uniqueId = randomUUID()

 const vehicleNorm = vehicle_number
   .replace(/\s/g,'')
   .toUpperCase()

 const client = await pool.connect()

 try{

   await client.query("BEGIN")

   const qr = await client.query(
     `INSERT INTO qrdata
      (user_id,unique_id,name,mobile,email,vehicle_number,blood_group,razorpay_payment_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
     [
       userId,
       uniqueId,
       name.trim(),
       mobile.replace(/\s/g,''),
       email.trim(),
       vehicleNorm,
       blood_group || null,
       razorpay_payment_id
     ]
   )

   for(const f of family){

     await client.query(
       `INSERT INTO family_details
        (qr_id,name,phone,relation)
        VALUES ($1,$2,$3,$4)`,
       [
         qr.rows[0].id,
         f.name.trim(),
         f.phone.replace(/\s/g,''),
         f.relation
       ]
     )
   }

   await client.query("COMMIT")

   return {
     ...qr.rows[0],
     alert_url:`${config.publicAppUrl}/alert/${uniqueId}`
   }

 }catch(e){

   await client.query("ROLLBACK")
   throw e

 }finally{
   client.release()
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
