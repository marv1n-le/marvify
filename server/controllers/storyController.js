import fs from "fs";
import imagekit from "../configs/imagekit.js";
import User from "../models/User.js";
import { inngest } from "../inngest/index.js";

// Add User Story
export const addUserStory = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { content, media_type, background_color } = req.body;
    const media = req.file;
    let media_url = "";

    //upload media to imagekit
    if (media_type === "image" || media_type === "video") {
      const fileBuffer = fs.readFileSync(media.path);
      const response = await imagekit.upload({
        file: fileBuffer,
        fileName: media.originalname,
      });
      media_url = response.url;
    }

    const story = await Story.create({
      user: userId,
      content,
      media_url,
      media_type,
      background_color,
    });

    await inngest.send({
      name: 'app/story.deleted',
      data: {
        storyId: story._id, 
      },
    });

    return res.status(200).json({ success: true, message: "Story created successfully", data: story });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get user stories
export const getStories = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);

    const userIds = [userId, ...user.connections, ...user.following];
    const stories = await Story.find({ user: { $in: userIds } })
      .populate("user")
      .sort({ createdAt: -1 });
    return res
      .status(200)
      .json({
        success: true,
        message: "Stories fetched successfully",
        data: stories,
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
