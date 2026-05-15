import { BlobServiceClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "DefaultEndpointsProtocol=https;AccountName=dummy;AccountKey=dummy;EndpointSuffix=core.windows.net";
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? "idamantsl-files";

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Buat container jika belum ada
  await containerClient.createIfNotExists({ access: "blob" });

  // Nama file unik agar tidak konflik
  const ext      = originalName.split(".").pop();
  const blobName = `penangkaran/sk/${uuidv4()}.${ext}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  // Return URL publik file
  return blockBlobClient.url;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Ambil nama blob dari URL
  const blobName = fileUrl.split(`${containerName}/`)[1];
  if (!blobName) return;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}