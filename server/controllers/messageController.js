import fs from "fs";
import imagekit from "../configs/imagekit.js";
import Message from "../models/Message.js";

const connections = {};

export const sseController = async (req, res) => {
  try {
    const { userId } = await req.auth();

    if (!userId) {
      res.status(401).write("event: error\ndata: Unauthorized\n\n");
      res.end();
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Accel-Buffering", "no");

    connections[userId] = res;

    res.write("event: connected\ndata: Connected to SSE endpoint\n\n");

    const heartbeat = setInterval(() => {
      if (connections[userId]) {
        try {
          res.write(": heartbeat\n\n");
        } catch (error) {
          clearInterval(heartbeat);
          delete connections[userId];
        }
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    res.on("close", () => {
      clearInterval(heartbeat);
      delete connections[userId];
    });

    res.on("error", (error) => {
      clearInterval(heartbeat);
      delete connections[userId];
    });
  } catch (error) {
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

export const sendMessage = async (req, res) => {
  try {
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

    const messageWithUserData = await Message.findById(message._id).populate(
      "from_user_id"
    );

    if (connections[userId]) {
      try {
        connections[userId].write(
          `data: ${JSON.stringify(messageWithUserData)}\n\n`
        );
      } catch (error) {
        delete connections[userId];
      }
    }

    if (connections[to_user_id]) {
      try {
        connections[to_user_id].write(
          `data: ${JSON.stringify(messageWithUserData)}\n\n`
        );
      } catch (error) {
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
