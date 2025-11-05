import express from "express";
import { protect } from "../middlewares/auth.js";
import { addPost, getFeedPosts, likePost } from "../controllers/postController.js";
import { upload } from "../configs/multer.js";

const postRouter = express.Router();

postRouter.get('/feed', protect, getFeedPosts);
postRouter.post('/add', upload.array('images', 4), protect, addPost);
postRouter.post('/like', protect, likePost)

export default postRouter;