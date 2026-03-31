import { Router } from "express";
import { body, validationResult } from "express-validator";

import { verifyOtpAndLogin } from "../services/auth.service.js";
import { databaseErrorResponse } from "../utils/dbErrors.js";
import { otpLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// router.post(
//   "/login",
//   otpLimiter,

//   body("mobile")
//     .trim()
//     .matches(/^[0-9]{10}$/)
//     .withMessage("Valid 10 digit mobile required"),

//   async (req, res) => {
//     const errors = validationResult(req);

//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         errors: errors.array()
//       });
//     }

//     const { mobile } = req.body;

//     return res.json({
//       message: "OTP sent (demo mode: use 1234)",
//       mobile
//     });
//   }
// );
import { generateOtp } from "../utils/otp.js";
import { sendOtpFast2SMS } from "../services/sms.service.js";

router.post("/login", async (req,res)=>{

 const { mobile } = req.body;

 const otp = generateOtp();

 await sendOtpFast2SMS({
   mobile,
   otp
 });

 return res.json({
   message:"OTP sent"
 });

});

router.post(
  "/verify-otp",

  body("mobile")
    .trim()
    .matches(/^[0-9]{10}$/),

  body("otp")
    .trim()
    .notEmpty(),

  async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }

    try {

      const { mobile, otp } = req.body;

      const { user, token } = await verifyOtpAndLogin(
        mobile,
        otp
      );

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          age: user.age,
          address: user.address,
          created_at: user.created_at
        }
      });

    } catch (e) {

      const db = databaseErrorResponse(e);

      if (db) {
        return res
          .status(db.status)
          .json({
            error: db.error,
            hint: db.hint
          });
      }

      const code = e.statusCode || 500;

      return res
        .status(code)
        .json({
          error: e.message
        });
    }
  }
);

export default router;