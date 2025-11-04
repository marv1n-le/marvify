import express from "express";
import { protect } from "../middlewares/auth.js";
import { acceptConnectionRequest, discoverUsers, followUser, getAllUsers, getUserConnections, getUserData, sendConnectionRequest, unfollowUser, updatedUserData } from "../controllers/userController.js";
import { upload } from "../configs/multer.js";

const userRouter = express.Router();

userRouter.get('/', protect, getAllUsers);
userRouter.get('/data', protect, getUserData);
userRouter.post('/update', upload.fields([{name: 'profile', maxCount: 1}, {name: 'cover', maxCount: 1}]), protect, updatedUserData);
userRouter.post('/discover', protect, discoverUsers);
userRouter.post('/follow', protect, followUser);
userRouter.post('/unfollow', protect, unfollowUser);
userRouter.post('/connect', protect, sendConnectionRequest);
userRouter.get('/connections', protect, getUserConnections);
userRouter.post('/accept', protect, acceptConnectionRequest);
export default userRouter;