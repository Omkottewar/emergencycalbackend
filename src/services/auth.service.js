import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { config } from "../config/index.js";

const DEMO_OTP = "1234";

export function verifyOtp(otp) {
  return String(otp) === DEMO_OTP;
}

export function issueToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      mobile: user.mobile
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: "emergency-qr-api",
      audience: "mobile-app"
    }
  );
}

export async function findOrCreateUserByMobile(mobile) {
  const result = await pool.query(
    `
    INSERT INTO users (mobile)
    VALUES ($1)
    ON CONFLICT (mobile)
    DO UPDATE SET mobile = EXCLUDED.mobile
    RETURNING *;
    `,
    [mobile]
  );

  return result.rows[0];
}

export async function updateLastLogin(userId) {
  await pool.query(
    `
    UPDATE users
    SET updated_at = NOW()
    WHERE id = $1
    `,
    [userId]
  );
}

export async function verifyOtpAndLogin(mobile, otp) {
  if (!verifyOtp(otp)) {
    const err = new Error("Invalid OTP");
    err.statusCode = 400;
    throw err;
  }

  const user = await findOrCreateUserByMobile(mobile);

  await updateLastLogin(user.id);

  const token = issueToken(user);

  return { user, token };
}