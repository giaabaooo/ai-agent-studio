import { describe, it, expect } from "vitest";
import { localStorageProvider } from "@/providers/storage/local-storage.provider";

describe("Storage Provider & Path Security", () => {
  it("should reject disallowed MIME types", async () => {
    const fakeExe = Buffer.from("MZ malicious exe");
    await expect(
      localStorageProvider.saveFile(
        fakeExe,
        "products",
        "virus.exe",
        "application/x-msdownload"
      )
    ).rejects.toThrow("Định dạng tệp không được hỗ trợ");
  });

  it("should save and read back a valid image buffer", async () => {
    const fakeImage = Buffer.from("fake-png-binary-content-123");
    const result = await localStorageProvider.saveFile(
      fakeImage,
      "products",
      "test_photo.png",
      "image/png"
    );

    expect(result.localPath).toContain("media/products");
    expect(result.fileSize).toBe(fakeImage.length);

    const exists = await localStorageProvider.fileExists(result.localPath);
    expect(exists).toBe(true);

    const buffer = await localStorageProvider.getFileBuffer(result.localPath);
    expect(buffer.toString()).toBe("fake-png-binary-content-123");

    // Clean up
    await localStorageProvider.deleteFile(result.localPath);
  });
});
