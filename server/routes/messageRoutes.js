import express from "express";
import { protect, protectSSE } from "../middlewares/auth.js";
import {
  sseController,
  sendMessage,
  getChatMessages,
} from "../controllers/messageController.js";
import { upload } from "../configs/multer.js";

const messageRouter = express.Router();

messageRouter.get("/sse", protectSSE, sseController);
messageRouter.post("/send", upload.single("image"), protect, sendMessage);
messageRouter.post("/get", protect, getChatMessages);

export default messageRouter;
