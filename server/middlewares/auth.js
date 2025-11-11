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

// Middleware đặc biệt cho SSE - hỗ trợ token từ query parameter
export const protectSSE = async (req, res, next) => {
  try {
    // Nếu có token trong query parameter, thêm vào headers
    if (req.query.token && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }

    const { userId } = await req.auth();
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};
