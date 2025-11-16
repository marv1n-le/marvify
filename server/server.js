import "dotenv/config";
import "./init.js";  
import express from "express";
import cors from "cors";
import connectDB from "./configs/db.js";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import { clerkMiddleware } from "@clerk/express";
import userRouter from "./routes/userRoutes.js";
import postRouter from "./routes/postRoutes.js";
import storyRouter from "./routes/storyRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

await connectDB();

app.use(cors());
app.use(express.json());

// Middleware để xử lý token từ query parameter cho SSE trước khi clerkMiddleware chạy
app.use((req, res, next) => {
  // Nếu là SSE endpoint và có token trong query, thêm vào headers
  if (req.path === "/api/messages/sse" && req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("Server is running properly."));

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/users", userRouter);
app.use("/api/posts", postRouter);
app.use("/api/stories", storyRouter);
app.use("/api/messages", messageRouter);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
