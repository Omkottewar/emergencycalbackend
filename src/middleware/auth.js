import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: "emergency-qr-api",
      audience: "mobile-app"
    });

    req.userId = decoded.sub;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}