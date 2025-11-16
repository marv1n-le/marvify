import fs from "fs";
import Post from "../models/Post.js";
import imagekit from "../configs/imagekit.js";

export const addPost = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { content, post_type } = req.body;
    const images = req.files;

    let image_urls = [];

    if (images.length) {
      image_urls = await Promise.all(
        images.map(async (image) => {
          const fileBuffer = fs.readFileSync(image.path);
          const response = await imagekit.upload({
            file: fileBuffer,
            fileName: image.originalname,
            folder: "posts",
          });
          const url = imagekit.url({
            path: response.filePath,
            transformation: [
              { quality: "auto" },
              { format: "webp" },
              { width: "1280" },
            ],
          });
          return url;
        })
      );
    }

    const post = await Post.create({
      user: userId,
      content,
      image_urls,
      post_type,
    });

    return res
      .status(200)
      .json({
        success: true,
        message: "Post created successfully",
        data: post,
      });
  } catch (error) {
    next(error);
  }
};

export const getFeedPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({}).populate("user").sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Feed posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    next(error);
  }
};

export const likePost = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.body;

    const post = await Post.findById(postId);

    if (post.likes_count.includes(userId)) {
      post.likes_count = post.likes_count.filter((id) => id !== userId);
      await post.save();
      return res
        .status(200)
        .json({ success: true, message: "Post liked successfully" });
    } else {
      post.likes_count.push(userId);
      await post.save();
      return res
        .status(200)
        .json({ success: true, message: "Post unliked successfully" });
    }
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (post.user.toString() !== userId) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You can only delete your own posts",
        });
    }

    await Post.findByIdAndDelete(postId);

    return res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    next(error);
  }
};
