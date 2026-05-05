import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { wilayah } from "../../db/schema";

export async function getAllWilayah(req: Request, res: Response): Promise<void> {
  try {
    const result = await db
      .select()
      .from(wilayah)
      .orderBy(wilayah.tipeWilayah, wilayah.nomorWilayah);

    res.status(200).json({ data: result });
  } catch {
    res.status(500).json({ message: "Gagal mengambil data wilayah" });
  }
}

export async function getWilayahBidang(req: Request, res: Response): Promise<void> {
  try {
    const result = await db
      .select()
      .from(wilayah)
      .where(eq(wilayah.tipeWilayah, "bidang"))
      .orderBy(wilayah.nomorWilayah);

    res.status(200).json({ data: result });
  } catch {
    res.status(500).json({ message: "Gagal mengambil data wilayah bidang" });
  }
}


export async function getWilayahSeksi(req: Request, res: Response): Promise<void> {
  try {
    const result = await db
      .select()
      .from(wilayah)
      .where(eq(wilayah.tipeWilayah, "seksi"))
      .orderBy(wilayah.nomorWilayah);

    res.status(200).json({ data: result });
  } catch {
    res.status(500).json({ message: "Gagal mengambil data wilayah seksi" });
  }
}