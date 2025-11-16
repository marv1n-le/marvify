export const protect = async (req, res, next) => {
  try {
    const { userId } = await req.auth();
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};

// Middleware đặc biệt cho SSE - token đã được set vào headers bởi middleware trong server.js
export const protectSSE = async (req, res, next) => {
  try {
    // Token đã được set vào headers bởi middleware trong server.js trước khi clerkMiddleware chạy
    // Bây giờ chỉ cần verify như bình thường
    const { userId } = await req.auth();

    if (!userId) {
      // Đối với SSE, không thể trả về JSON, phải để controller xử lý
      const error = new Error("Unauthorized");
      error.status = 401;
      return next(error);
    }

    next();
  } catch (error) {
    console.error("protectSSE error:", error);
    // Pass error để controller xử lý
    error.status = error.status || 401;
    return next(error);
  }
};
