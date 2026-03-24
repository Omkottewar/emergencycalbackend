import express from "express";
import { initiateCallController } from "../services/callInitiate.js";

const router = express.Router();

// POST /call/initiate
router.post("/initiate", initiateCallController);

export default router;