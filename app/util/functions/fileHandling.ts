import * as FileSystem from "expo-file-system";

export async function uploadToS3(
  fileUri: string,
  uploadUrl: string,
  mimeType: string
): Promise<void> {
  try {
    console.log(`[uploadToS3] Starting upload to S3. URL: ${uploadUrl.substring(0, 50)}..., MIME: ${mimeType}, File: ${fileUri}`);
    const fileBlob = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    console.log(`[uploadToS3] Upload finished. Status: ${fileBlob.status}`);
    if (fileBlob.status !== 200 && fileBlob.status !== 201) {
      console.error(`[uploadToS3] S3 responded with failure:`, fileBlob.body);
      throw new Error(`Upload to S3 failed with status ${fileBlob.status}`);
    }
  } catch (error) {
    console.error("[uploadToS3] Error during S3 upload:", error);
    throw error;
  }
}

/**
 * Converts a local URI to a File object for upload (e.g., to S3).
 */
export async function getFileFromUri(
  uri: string,
  mimeType: string
): Promise<File> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error("File does not exist at the provided URI");
    }

    const fileUriParts = uri.split("/");
    const fileName = fileUriParts[fileUriParts.length - 1];

    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error("Failed to fetch file from URI");
    }

    const blob = await response.blob();

    return new File([blob], fileName, { type: mimeType });
  } catch (error) {
    console.error("getFileFromUri error:", error);
    throw error;
  }
}
