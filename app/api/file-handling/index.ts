import axiosClient from "../axiosClient";

export async function generateUploadUrl(
  fileName: string,
  fileType: string,
  bucketName: string,
): Promise<string | null> {
  try {
    console.log("generateUploadUrl API call", {
      fileName,
      fileType,
      bucketName,
    });
    const response = await axiosClient.get<{ uploadUrl: string | null }>(
      "/file-handling/generateUploadUrl",
      {
        params: {
          fileName,
          fileType,
          bucketName,
        },
      },
    );
    console.log("generateUploadUrl API response", response.data);
    const { uploadUrl } = response.data;
    if (!uploadUrl) {
      throw new Error("S3 Upload url is null");
    }
    return uploadUrl;
  } catch (error) {
    console.error(
      "There was a problem with the generateUploadUrl API call:",
      error,
    );
    throw error;
  }
}
