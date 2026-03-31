import crypto from "crypto";
import Razorpay from "razorpay";
import { config } from "../config/index.js";

let client;

export function getRazorpay() {

 if (!client) {

  client = new Razorpay({
   key_id: config.razorpayKeyId,
   key_secret: config.razorpayKeySecret
  });

 }

 return client;
}

export const DEFAULT_AMOUNT_PAISE = 35300;

export async function createOrder(amount, receipt) {

 const razorpay = getRazorpay();

 const order = await razorpay.orders.create({
  amount,
  currency: "INR",
  receipt,
  payment_capture: 1
 });

 return order;
}

export function verifyPaymentSignature(orderId, paymentId, signature) {

 const body = `${orderId}|${paymentId}`;

 const expected = crypto
  .createHmac("sha256", config.razorpayKeySecret)
  .update(body)
  .digest("hex");

 return expected === signature;
}

export async function verifyPaymentWithRazorpay(paymentId) {

 const razorpay = getRazorpay();

 const payment = await razorpay.payments.fetch(paymentId);

 if (payment.status !== "captured") {
  throw new Error("Payment not captured");
 }

 return payment;
}