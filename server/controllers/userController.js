import imagekit from "../configs/imagekit.js";
import { inngest } from "../inngest/index.js";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import fs from "fs";

// Get user data by id
export const getUserData = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      message: "User data fetched successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// get all users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({});
    return res
      .status(200)
      .json({
        success: true,
        message: "All users fetched successfully",
        data: users,
      });
  } catch (error) {
    next(error);
  }
};

// Update user data
export const updatedUserData = async (req, res, next) => {
  try {
    console.log(req.body, req.headers);
    const { userId } = req.auth();
    let { username, bio, location, full_name } = req.body;

    const tempUser = await User.findById(userId);

    !username && (username = tempUser.username);

    if (!tempUser.username !== username) {
      const user = await User.findOne({ username });
      if (user) {
        username = tempUser.username;
      }
    }

    const updatedUserData = {
      username,
      bio,
      location,
      full_name,
    };

    const profile = req.files?.profile && req.files.profile[0];
    const cover = req.files?.cover && req.files.cover[0];

    if (profile) {
      const buffer = fs.readFileSync(profile.path);
      const response = await imagekit.upload({
        file: buffer,
        fileName: profile.originalname,
      });
      console.log(response);
      const url = imagekit.url({
        path: response.filePath,
        transformation: [
          { quality: "auto" },
          { format: "webp" },
          { width: "512" },
        ],
      });
      updatedUserData.profile_picture = url;
    }

    if (cover) {
      const buffer = fs.readFileSync(cover.path);
      const response = await imagekit.upload({
        file: buffer,
        fileName: cover.originalname,
      });
      const url = imagekit.url({
        path: response.filePath,
        transformation: [
          { quality: "auto" },
          { format: "webp" },
          { width: "1280" },
        ],
      });
      updatedUserData.cover_photo = url;
    }
    const user = await User.findByIdAndUpdate(userId, updatedUserData, {
      new: true,
    });

    return res
      .status(200)
      .json({
        success: true,
        message: "User data updated successfully",
        data: user,
      });
  } catch (error) {
    next(error);
  }
};

// Search users
export const discoverUsers = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { input } = req.body;

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, "i") },
        { email: new RegExp(input, "i") },
        { full_name: new RegExp(input, "i") },
        { location: new RegExp(input, "i") },
      ],
    });

    const filteredUsers = allUsers.filter((user) => user._id !== userId);

    return res
      .status(200)
      .json({
        success: true,
        message: "Users fetched successfully",
        data: filteredUsers,
      });
  } catch (error) {
    next(error);
  }
};

// Follow user
export const followUser = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);

    if (user.following.includes(id)) {
      return res.json({
        success: false,
        message: "Already following the user",
      });
    }

    user.following.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers.push(userId);
    await toUser.save();

    return res
      .status(200)
      .json({ success: true, message: "Followed the user successfully" });
  } catch (error) {
    next(error);
  }
};

// Unfollow user
export const unfollowUser = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);
    user.following = user.following.filter((user) => user !== id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers = toUser.followers.filter((user) => user !== userId);
    await toUser.save();
    return res
      .status(200)
      .json({ success: true, message: "Unfollowed the user successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Send connection request
export const sendConnectionRequest = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    console.log("➡️ sendConnectionRequest called by:", userId, "to:", id);

    // kiểm tra input
    if (!id) {
      console.warn("⚠️ Missing 'id' in body");
      return res
        .status(400)
        .json({ success: false, message: "Missing id in body" });
    }

    // Check if user has sent more than 20 connection requests in the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const connectionRequests = await Connection.find({
      from_user_id: userId,
      createdAt: { $gt: last24Hours },
    });

    console.log("📊 connectionRequests count:", connectionRequests.length);

    if (connectionRequests.length >= 20) {
      console.warn("🚫 Too many requests from:", userId);
      return res.status(400).json({
        success: false,
        message:
          "You have sent too many connection requests. Please try again later.",
      });
    }

    // Check if users are already connected
    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId },
      ],
    });

    console.log("🔍 Found connection:", connection);

    if (!connection) {
      console.log("🆕 Creating new pending connection...");
      const newConnection = await Connection.create({
        from_user_id: userId,
        to_user_id: id,
        status: "pending",
      });

      await inngest.send({
        name: "app/connection-request",
        data: {
          connectionId: newConnection._id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Connection request sent successfully",
      });
    } else if (connection && connection.status === "accepted") {
      console.warn("⚠️ Already connected:", connection);
      return res.status(400).json({
        success: false,
        message: "You are already connected to this user",
      });
    }

    console.warn("⚠️ Duplicate request:", connection);
    return res.status(400).json({
      success: false,
      message: "You have already sent a connection request to this user",
    });
  } catch (error) {
    console.error("💥 Error in sendConnectionRequest:", error);
    next(error);
  }
};


// Get user connections
export const getUserConnections = async (req, res, next) => {
  try {
    const { userId } = req.auth?.() || {}; 
    console.log("➡️ getUserConnections called by:", userId);

    const user = await User.findById(userId).populate(
      "connections followers following"
    );
    if (!user) {
      console.warn("⚠️ User not found:", userId);
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const pendingConnectionsDocs = await Connection.find({
      to_user_id: userId,
      status: "pending",
    }).populate("from_user_id");

    const pendingConnections = pendingConnectionsDocs.map(
      (c) => c.from_user_id
    );

    return res.status(200).json({
      success: true,
      data: {
        connections: user.connections,
        followers: user.followers,
        following: user.following,
        pendingConnections,
      },
    });
  } catch (error) {
    console.error("💥 Error in getUserConnections:", error);
    next(error);
  }
};

// Accept connection request
export const acceptConnectionRequest = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const connection = await Connection.findOne({
      from_user_id: id,
      to_user_id: userId,
      status: "pending",
    });

    if (!connection) {
      return res
        .status(400)
        .json({ success: false, message: "Connection request not found" });
    }

    const user = await User.findById(userId);
    user.connections.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.connections.push(userId);
    await toUser.save();

    connection.status = "accepted";
    await connection.save();

    return res
      .status(200)
      .json({
        success: true,
        message: "Connection request accepted successfully",
      });
  } catch (error) {
    next(error);
  }
};

// Get user profile
export const getUserProfile = async (req, res, next) => {
  try {
    const { profileId } = req.body;
    const profile = await User.findById(profileId);

    if (!profile) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const posts = await Post.find({ user: profileId }).populate("user");
    return res.status(200).json({ success: true, data: { profile, posts } });
  } catch (error) {
    next(error);
  }
};
