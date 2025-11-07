export const errorHandler = (err, req, res, next) => {
  console.error("\n=== 🛑 SERVER ERROR ===");
  console.error("🕓 Time:", new Date().toISOString());
  console.error("📍 Route:", req.method, req.originalUrl);
  console.error("👤 User (auth?):", req.auth ? req.auth() : "No auth()");
  console.error("📦 Body:", req.body);
  console.error("💬 Error:", err.message);
  console.error("📜 Stack:\n", err.stack);
  console.error("========================\n");

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
