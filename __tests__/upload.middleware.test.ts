import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import { uploadPdf } from "../src/middlewares/upload.middleware";

const app = express();

app.post("/upload", uploadPdf.single("file"), (req: Request, res: Response) => {
  res.status(200).json({ success: true, file: req.file });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(400).json({ success: false, message: err.message });
});

describe("Upload Middleware", () => {
  it("should accept a PDF file", async () => {
    const response = await request(app)
      .post("/upload")
      .attach("file", Buffer.from("dummy pdf content"), {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should reject a non-PDF file", async () => {
    const response = await request(app)
      .post("/upload")
      .attach("file", Buffer.from("dummy image content"), {
        filename: "test.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Hanya file PDF yang diizinkan");
  });
});
