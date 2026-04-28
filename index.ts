import dotenv from "dotenv";
import express from "express";
import authRoutes from "./src/routes/auth.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(express.urlencoded({ extended: true }));
app.disable("x-powered-by");

app.get("/", (req, res) => {
  res.json({ message: "IDAMAN TSL API berjalan ✅" });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

export default app;
