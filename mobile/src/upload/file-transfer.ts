import * as FileSystem from 'expo-file-system/legacy';

export type TransferHandle = {
  start: () => Promise<{ status: number }>;
  cancel: () => Promise<void>;
};

/**
 * Uploads a local file to a Mux direct-upload URL as a binary PUT.
 * onProgress receives a fraction 0..1. The upload URL is a capability URL —
 * never log it.
 */
export function createFileTransfer(
  localUri: string,
  uploadUrl: string,
  onProgress: (fraction: number) => void,
): TransferHandle {
  const task = FileSystem.createUploadTask(
    uploadUrl,
    localUri,
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    },
    (progress) => {
      const total = progress.totalBytesExpectedToSend || 1;
      onProgress(progress.totalBytesSent / total);
    },
  );
  return {
    start: async () => {
      const result = await task.uploadAsync();
      return { status: result?.status ?? 0 };
    },
    cancel: () => task.cancelAsync(),
  };
}
