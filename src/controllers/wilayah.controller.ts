import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { wilayah } from "../../db/schema";
import { handleError } from "../helpers/controller.helpers";

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
    const result = await db
      .select()
      .from(wilayah)
      .where(eq(wilayah.tipeWilayah, "seksi"))
      .orderBy(wilayah.nomorWilayah);

    res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error, "getWilayahSeksi", "Gagal mengambil data wilayah seksi");
  }
}