import dotenv from "dotenv";
import express from "express";
import authRoutes from "./src/routes/auth.routes";
import penangkaranRoutes from "./src/routes/penangkaran.routes";
import userRoutes from "./src/routes/user.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/penangkaran", penangkaranRoutes);

app.get("/", (req, res) => {
  res.json({ message: "IDAMAN TSL API berjalan ✅" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}
export default app;
