import express from "express";
import { protect } from "../middlewares/auth.js";
import { sseController, sendMessage, getChatMessages } from "../controllers/messageController.js";
import { upload } from "../configs/multer.js";

const messageRouter = express.Router();

messageRouter.get('/:userId', protect, sseController);
messageRouter.post('/send', upload.single('image'), protect, sendMessage);
messageRouter.get('/get', protect, getChatMessages);

export default messageRouter;