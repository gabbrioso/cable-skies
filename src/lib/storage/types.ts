export interface StorageAdapter {
  saveUpload(filename: string, data: Buffer): Promise<string>;
  saveThumb(filename: string, data: Buffer): Promise<string>;
  read(storagePath: string): Promise<Buffer | null>;
  remove(storagePath: string): Promise<void>;
  publicUrl(storagePath: string): string;
}
