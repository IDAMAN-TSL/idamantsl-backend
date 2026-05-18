import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.routes";
import penangkaranRoutes from "./src/routes/penangkaran.routes";
import pengedaranDnRoutes from "./src/routes/pengedaran-dn.routes";
import pengedaranLnRoutes from "./src/routes/pengedaran-ln.routes";
import lembagaKonservasiRoutes from "./src/routes/lembaga-konservasi.routes";
import userRoutes from "./src/routes/user.routes";
import referensiTslRoutes from "./src/routes/referensi-tsl.routes";
import verifikasiRoutes from "./src/routes/verifikasi.routes";
import wilayahRoutes from "./src/routes/wilayah.routes";


dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.disable("x-powered-by");
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wilayah", wilayahRoutes);
app.use("/api/referensi-tsl", referensiTslRoutes);
app.use("/api/verifikasi", verifikasiRoutes);
app.use("/api/penangkaran", penangkaranRoutes);
app.use("/api/pengedaran-dn", pengedaranDnRoutes);
app.use("/api/pengedaran-ln", pengedaranLnRoutes);
app.use("/api/lembaga-konservasi", lembagaKonservasiRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "IDAMAN TSL API berjalan ✅" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}
export default app;
