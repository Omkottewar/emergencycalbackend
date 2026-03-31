import axios from "axios";
import { config } from "../config/index.js";

export async function sendOtpFast2SMS({ mobile, otp }) {

  if (config.nodeEnv === "development" && !config.fast2smsApiKey) {
    console.log("⚠️ DEMO OTP:", otp, "for", mobile);

    return {
      ok: true,
      demo: true
    };
  }

  const response = await axios.post(
    "https://www.fast2sms.com/dev/bulkV2",
    {
      route: "otp",
      variables_values: otp,
      numbers: mobile
    },
    {
      headers: {
        authorization: config.fast2smsApiKey,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
}