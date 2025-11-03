import express from "express";
import cors from "cors";
import 'dotenv/config';
import connectDB from "./configs/db.js";

const app = express();

await connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Server is running"));

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});