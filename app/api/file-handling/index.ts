import axiosClient from "../axiosClient";

export async function generateUploadUrl(
  fileName: string,
  fileType: string,
  bucketName: string
): Promise<string | null> {
  try {
    const response = await axiosClient.get<{ uploadUrl: string | null }>(
      "/file-handling/generateUploadUrl",
      {
        params: {
          fileName,
          fileType,
          bucketName,
        },
      }
    );
    const { uploadUrl } = response.data;
    return uploadUrl;
  } catch (error) {
    console.error(
      "There was a problem with the generateUploadUrl API call:",
      error
    );
    throw error;
  }
}
