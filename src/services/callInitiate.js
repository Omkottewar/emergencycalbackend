
import { initiateMaskedCall } from "./exotel.service.js";
import { getFamilyByQrId, getQrByUniqueId } from "./qr.service.js";

export const initiateCallController = async (req, res) => {
  try {
    const { qrId } = req.body;

    console.log("📞 Call request for QR:", qrId);

    // 🔥 STEP 1: Get QR data
    const qr = await getQrByUniqueId(qrId);
    if (!qr) {
      return res.status(404).json({ error: "QR not found" });
    }

    // 🔥 STEP 2: Get emergency contact
    const family = await getFamilyByQrId(qr.id);

    if (!family || family.length === 0) {
      return res.status(400).json({ error: "No contacts found" });
    }

    const contact = family[0]; // first priority

    console.log("📱 Calling contact:", contact.phone);

    // 🔥 STEP 3: Call Exotel
    const result = await initiateMaskedCall({
      from: "02048563693", // optional (can be dummy)
      to: `+91${contact.phone}`,
      qrId,
    });

    return res.json(result);

  } catch (e) {
    console.error("❌ Call error:", e);
    res.status(500).json({ error: e.message });
  }
};