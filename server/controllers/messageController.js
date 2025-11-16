import fs from "fs";
import imagekit from "../configs/imagekit.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

// Create an empty object to store SS Event connections
const connections = {};

// Controller function for the SSE endpoint
export const sseController = async (req, res) => {
  try {
    const { userId } = await req.auth();

    if (!userId) {
      res.status(401).write("event: error\ndata: Unauthorized\n\n");
      res.end();
      return;
    }

    console.log("New client connected:", userId);

    // Set SSE headers - QUAN TRỌNG: phải set trước khi write
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for nginx

    // Add the client to the connections object
    connections[userId] = res;

    // Send an initial event to the client
    res.write("event: connected\ndata: Connected to SSE endpoint\n\n");

    // Send heartbeat để giữ connection alive
    const heartbeat = setInterval(() => {
      if (connections[userId]) {
        try {
          res.write(": heartbeat\n\n");
        } catch (error) {
          console.error("Error sending heartbeat:", error);
          clearInterval(heartbeat);
          delete connections[userId];
        }
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // Send heartbeat every 30 seconds

    res.on("close", () => {
      clearInterval(heartbeat);
      delete connections[userId];
      console.log("Client disconnected:", userId);
    });

    res.on("error", (error) => {
      console.error("SSE connection error:", error);
      clearInterval(heartbeat);
      delete connections[userId];
    });
  } catch (error) {
    console.error("SSE controller error:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .write(
          "event: error\ndata: " +
            JSON.stringify({ message: error.message }) +
            "\n\n"
        );
      res.end();
    }
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

    const { userId } = req.auth();
    const { to_user_id, text } = req.body;
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
      to_user_id: to_user_id,
      text,
      message_type,
      media_url: mediaUrl,
    });

    // Send message to to_user_id using SSE
    const messageWithUserData = await Message.findById(message._id).populate(
      "from_user_id"
    );

    // Also send to sender if they have the chat open
    if (connections[userId]) {
      try {
        connections[userId].write(
          `data: ${JSON.stringify(messageWithUserData)}\n\n`
        );
        console.log("📤 SSE sent to sender:", userId);
      } catch (error) {
        console.error("Error sending SSE to sender:", error);
        delete connections[userId];
      }
    }

    if (connections[to_user_id]) {
      try {
        connections[to_user_id].write(
          `data: ${JSON.stringify(messageWithUserData)}\n\n`
        );
        console.log("📤 SSE sent to receiver:", to_user_id);
      } catch (error) {
        console.error("Error sending SSE to receiver:", error);
        delete connections[to_user_id];
      }
    }

    res.json({
      success: true,
      message: "Message sent successfully",
      data: messageWithUserData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get messages
export const getChatMessages = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id } = req.body;

    const messages = await Message.find({
      $or: [
        { from_user_id: userId, to_user_id: to_user_id },
        { from_user_id: to_user_id, to_user_id: userId },
      ],
    })
      .populate("from_user_id")
      .sort({ createdAt: -1 });

    // Mark messages as seen
    await Message.updateMany(
      {
        from_user_id: to_user_id,
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
