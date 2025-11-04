import "dotenv/config";
import ImageKit from "imagekit";

// Debug: Kiểm tra biến môi trường
console.log(
  "Public Key:",
  process.env.IMAGEKIT_PUBLIC_KEY ? "✓ Loaded" : "✗ Missing"
);
console.log(
  "Private Key:",
  process.env.IMAGEKIT_PRIVATE_KEY ? "✓ Loaded" : "✗ Missing"
);
console.log(
  "URL Endpoint:",
  process.env.IMAGEKIT_URL_ENDPOINT ? "✓ Loaded" : "✗ Missing"
);

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

// Kiểm tra nếu thiếu key
if (!process.env.IMAGEKIT_PUBLIC_KEY) {
  throw new Error("IMAGEKIT_PUBLIC_KEY is missing from environment variables");
}

export default imagekit;
