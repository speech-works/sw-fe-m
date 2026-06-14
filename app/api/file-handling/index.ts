import axiosClient from "../axiosClient";

/**
 * Requests a presigned upload URL. The backend allowlists the bucket and forces
 * the object key under the authenticated user's id, returning the canonical
 * `objectKey` to store (do NOT reuse the client-built fileName as the key).
 */
export async function generateUploadUrl(
  fileName: string,
  fileType: string,
  bucketName: string,
): Promise<{ uploadUrl: string; objectKey: string }> {
  try {
    const response = await axiosClient.get<{
      uploadUrl: string | null;
      objectKey: string | null;
    }>("/file-handling/generateUploadUrl", {
      params: {
        fileName,
        fileType,
        bucketName,
      },
    });
    const { uploadUrl, objectKey } = response.data;
    if (!uploadUrl || !objectKey) {
      throw new Error("S3 upload URL generation failed");
    }
    return { uploadUrl, objectKey };
  } catch (error) {
    console.error(
      "There was a problem with the generateUploadUrl API call:",
      error,
    );
    throw error;
  }
}
