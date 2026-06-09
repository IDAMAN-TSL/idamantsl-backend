import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { wilayah } from "../../db/schema";
import { handleError } from "../helpers/controller.helpers";

const SEKSI_BY_BIDANG: Record<string, string[]> = {
  bogor: ["serang", "bogor"],
  soreang: ["soreang", "purwakarta"],
  ciamis: ["garut", "tasikmalaya"],
};

export async function getAllWilayah(req: Request, res: Response) {
  try {
    const result = await db
      .select()
      .from(wilayah)
      .orderBy(wilayah.tipeWilayah, wilayah.nomorWilayah);

    res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error, "getAllWilayah", "Gagal mengambil data wilayah");
  }
}

export async function getWilayahBidang(req: Request, res: Response) {
  try {
    const result = await db
      .select()
      .from(wilayah)
      .where(eq(wilayah.tipeWilayah, "bidang"))
      .orderBy(wilayah.nomorWilayah);

    res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error, "getWilayahBidang", "Gagal mengambil data wilayah bidang");
  }
}


export async function getWilayahSeksi(req: Request, res: Response) {
  try {
    const bidangWilayahId = req.query.bidangWilayahId ?? req.query.bidangId;
    const bidangNameFromQuery = typeof req.query.bidang === "string" ? req.query.bidang : undefined;
    let bidangName = bidangNameFromQuery?.toLowerCase();

    if (bidangWilayahId) {
      const bidang = await db
        .select()
        .from(wilayah)
        .where(eq(wilayah.id, Number(bidangWilayahId)))
        .limit(1);

      if (!bidang[0] || bidang[0].tipeWilayah !== "bidang") {
        res.status(404).json({ message: "Bidang wilayah tidak ditemukan" });
        return;
      }

      bidangName = bidang[0].namaWilayah.toLowerCase();
    }

    const result = await db
      .select()
      .from(wilayah)
      .where(eq(wilayah.tipeWilayah, "seksi"))
      .orderBy(wilayah.nomorWilayah);

    if (!bidangName) {
      res.status(200).json({ data: result });
      return;
    }

    const allowedSeksi = SEKSI_BY_BIDANG[bidangName];
    if (!allowedSeksi) {
      res.status(400).json({ message: "Bidang wilayah tidak valid" });
      return;
    }

    res.status(200).json({
      data: result.filter((item) => allowedSeksi.includes(item.namaWilayah.toLowerCase())),
    });
  } catch (error) {
    return handleError(res, error, "getWilayahSeksi", "Gagal mengambil data wilayah seksi");
  }
}
