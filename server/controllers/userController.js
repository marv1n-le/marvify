import imagekit from "../configs/imagekit.js";
import { inngest } from "../inngest/index.js";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import fs from "fs";

// Get user data by id
export const getUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res
      .status(200)
      .json({
        success: true,
        message: "User data fetched successfully",
        data: user,
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// get all users 
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    return res.status(200).json({ success: true, message: "All users fetched successfully", data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update user data
export const updatedUserData = async (req, res) => {
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

    return res.status(200).json({ success: true, message: "User data updated successfully", data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Search users
export const discoverUsers = async (req, res) => {
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

    return res.status(200).json({ success: true, message: "Users fetched successfully", data: filteredUsers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Follow user
export const followUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);

    if (user.following.includes(id)) {
      return res.json({ success: false, message: "Already following the user" });
    }

    user.following.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers.push(userId);
    await toUser.save();

    return res.status(200).json({ success: true, message: "Followed the user successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Unfollow user
export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);
    user.following = user.following.filter(user => user !== id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers = toUser.followers.filter(user => user !== userId);
    await toUser.save();
    return res.status(200).json({ success: true, message: "Unfollowed the user successfully" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Send connection request
export const sendConnectionRequest = async(req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    //Check if user has sent more than 20 connection requests in the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const connectionRequests = await Connection.find({ 
      from_user_id: userId,
      createdAt: { $gt: last24Hours }
    })

    if (connectionRequests.length >= 20) {
      return res.status(400).json({ success: false, message: "You have sent too many connection requests. Please try again later." });
    }

    // Check if users are already connected
    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId }
      ]
    })

    if (!connection) {
      const newConnection = await Connection.create({
        from_user_id: userId,
        to_user_id: id,
        status: 'pending'
      })

      await inngest.send({
        name: 'app/connection-request',
        data: {
          connectionId: newConnection._id,
        },
      });

      return res.status(200).json({ success: true, message: "Connection request sent successfully" });
    } else if (connection && connection.status === "accepted") {
      return res.status(400).json({ success: false, message: "You are already connected to this user" });
    }

    return res.status(400).json({ success: false, message: "You have already sent a connection request to this user" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Get user connections
export const getUserConnections = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId).populate('connections followers following');

    const connections = user.connections;
    const followers = user.followers;
    const following = user.following;

    const pendingConnections = (await Connection.find({
      to_user_id: userId,
      status: 'pending'
    })).populate('from_user_id').map(connection => connection.from_user_id);

    return res.status(200).json({ success: true, data: { connections, followers, following, pendingConnections } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Accept connection request
export const acceptConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const connection = await Connection.findOne({
      from_user_id: id,
      to_user_id: userId,
      status: 'pending'
    })

    if (!connection) {
      return res.status(400).json({ success: false, message: "Connection request not found" });
    }

    const user = await User.findById(userId);
    user.connections.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.connections.push(userId);
    await toUser.save();

    connection.status = 'accepted';
    await connection.save();

    return res.status(200).json({ success: true, message: "Connection request accepted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const { profileId } = req.body;
    const profile = await User.findById(profileId);

    if (!profile) {
      return res.json({ success: false, message: "User not found" });
    }

    const posts = await Post.find({ user: profileId }).populate('user');
    return res.json({ success: true, data: { profile, posts } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}