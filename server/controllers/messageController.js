import fs from "fs";
import imagekit from "../configs/imagekit.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

// Create an empty object to store SS Event connections
const connections = {};

// Controller function for the SSE endpoint
export const sseController = (req, res) => {
  const { userId } = req.auth();

  console.log("New client connected:", userId);

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Add the client to the connections object
  connections[userId] = res;

  // Send an initial event to the client
  res.write("log: Connected to SSE endpoint\n\n");

  res.on("close", () => {
    //Remove the client's response object from the connections array
    delete connections[userId];
    console.log("Client disconnected:", userId);
  });
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { toUserId, text } = req.body;
    const image = req.file;

    let mediaUrl = "";
    let message_type = image ? "image" : "text";

    if (message_type === "image") {
      const fileBuffer = fs.readFileSync(image.path);
      const response = await imagekit.upload({
        file: fileBuffer,
        fileName: image.originalname,
      });
      mediaUrl = imagekit.url({
        path: response.filePath,
        transformation: [
          { quality: "auto" },
          { format: "webp" },
          { width: "1280" },
        ],
      });
    }

    const message = await Message.create({
      from_user_id: userId,
      to_user_id: toUserId,
      text,
      message_type,
      media_url: mediaUrl,
    });
    res.json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });

    // Send message to to_user_id using SSE
    const messageWithUserData = await Message.findById(message._id).populate(
      "from_user_id"
    );

    if (connections[toUserId]) {
      connections[toUserId].write(
        `data: ${JSON.stringify(messageWithUserData)}\n\n`
      );
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get messages
export const getChatMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { toUserId } = req.body;

    const messages = await Message.find({
      $or: [
        { from_user_id: userId, to_user_id: toUserId },
        { from_user_id: toUserId, to_user_id: userId },
      ],
    }).sort({ createdAt: -1 });

    // Mark messages as seen
    await Message.updateMany(
      {
        from_user_id: toUserId,
        to_user_id: userId,
        seen: false,
      },
      { seen: true }
    );

    return res.json({ success: true, data: messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserRecentMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const messages = await Message.find({ to_user_id: userId })
      .populate("from_user_id to_user_id")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
