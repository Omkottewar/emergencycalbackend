import rateLimit from "express-rate-limit";

export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: "Too many OTP requests. Try again later."
  }
});