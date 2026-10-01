export interface SavedFileResult {
  localPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface StorageProvider {
  saveFile(
    fileBuffer: Buffer,
    subFolder: string,
    originalName: string,
    mimeType: string
  ): Promise<SavedFileResult>;

  getFileBuffer(localPath: string): Promise<Buffer>;

  deleteFile(localPath: string): Promise<void>;

  fileExists(localPath: string): Promise<boolean>;
}
