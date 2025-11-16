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

export const protectSSE = async (req, res, next) => {
  try {
    const { userId } = await req.auth();

    if (!userId) {
      const error = new Error("Unauthorized");
      error.status = 401;
      return next(error);
    }

    next();
  } catch (error) {
    error.status = error.status || 401;
    return next(error);
  }
};
