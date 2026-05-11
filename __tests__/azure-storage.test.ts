import { uploadFile, deleteFile } from "../src/helpers/azure-storage";
import { BlobServiceClient } from "@azure/storage-blob";

jest.mock("@azure/storage-blob", () => {
  const uploadDataMock = jest.fn();
  const deleteIfExistsMock = jest.fn();
  const createIfNotExistsMock = jest.fn();
  
  const blockBlobClientMock = {
    uploadData: uploadDataMock,
    url: "https://mock.blob.core.windows.net/test/file.pdf",
    deleteIfExists: deleteIfExistsMock,
  };
  
  const containerClientMock = {
    createIfNotExists: createIfNotExistsMock,
    getBlockBlobClient: jest.fn(() => blockBlobClientMock),
  };
  
  return {
    BlobServiceClient: {
      fromConnectionString: jest.fn(() => ({
        getContainerClient: jest.fn(() => containerClientMock),
      })),
    },
  };
});

describe("Azure Storage Helpers", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("uploadFile", () => {
    it("should upload a file and return its URL", async () => {
      const buffer = Buffer.from("test content");
      const url = await uploadFile(buffer, "test.pdf", "application/pdf");
      
      expect(url).toBe("https://mock.blob.core.windows.net/test/file.pdf");
      
      // Verify fromConnectionString was called implicitly at module load or explicitly
      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalled();
    });
  });

  describe("deleteFile", () => {
    it("should delete a file based on its URL", async () => {
      const fileUrl = "https://mock.blob.core.windows.net/idamantsl-files/penangkaran/sk/123.pdf";
      await deleteFile(fileUrl);
      
      // Since deleteIfExists is inside the mocked blockBlobClient
      // we can't directly expect deleteIfExists to have been called if we don't expose it
      // Let's get the containerClient from the fromConnectionString mock
      const blobServiceClient = BlobServiceClient.fromConnectionString("");
      const containerClient = blobServiceClient.getContainerClient("");
      const blockBlobClient = containerClient.getBlockBlobClient("");
      
      expect(blockBlobClient.deleteIfExists).toHaveBeenCalled();
    });

    it("should not delete if blobName is empty", async () => {
      const fileUrl = "https://mock.blob.core.windows.net/invalid-url/123.pdf";
      await deleteFile(fileUrl);
      
      const blobServiceClient = BlobServiceClient.fromConnectionString("");
      const containerClient = blobServiceClient.getContainerClient("");
      const blockBlobClient = containerClient.getBlockBlobClient("");
      
      expect(blockBlobClient.deleteIfExists).not.toHaveBeenCalled();
    });
  });
});
