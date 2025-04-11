import * as FileSystem from "expo-file-system";
import { createRecording, getUploadUrl } from "../../api/recordings";

export const uploadRecordingToS3 = async (uri: string, fileName: string) => {
  try {
    const mimeType = getMimeTypeFromUri(uri);

    // Step 1: Get presigned upload URL
    const uploadURL = await getUploadUrl(fileName, mimeType);

    // Step 2: Read file as binary
    const fileData = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binaryBuffer = Uint8Array.from(atob(fileData), (c) =>
      c.charCodeAt(0)
    );

    // Step 3: Upload to presigned URL
    const res = await fetch(uploadURL, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: binaryBuffer,
    });

    if (!res.ok) throw new Error("Recording upload failed");

    return {
      fileName,
      mimeType,
    };
  } catch (err) {
    console.error("Upload to S3 failed:", err);
    return null;
  }
};

export const getMimeTypeFromUri = (uri: string): string => {
  if (uri.endsWith(".m4a")) {
    return "audio/m4a";
  } else if (uri.endsWith(".wav")) {
    return "audio/wav";
  } else if (uri.endsWith(".mp3")) {
    return "audio/mpeg";
  } else if (uri.endsWith(".webm")) {
    return "audio/webm";
  }
  // Default fallback MIME type
  return "application/octet-stream";
};

interface RecordingProps {
  uri: string;
  audioDuration?: number;
  userId: string;
  activityId: string;
  scriptId: string;
}

export const saveRecordingToBE = async ({
  uri,
  audioDuration,
  userId,
  activityId,
  scriptId,
}: RecordingProps) => {
  // Determine a dynamic file name from the URI extension (e.g. ".wav", ".m4a", ".webm")
  const fileExtension = uri.substring(uri.lastIndexOf("."));
  const fileName = `sw-voice-rec-${Date.now()}${fileExtension}`;
  console.log("saveRecordingToBE:", {
    uri,
    audioDuration,
    userId,
    activityId,
    scriptId,
    fileName,
    fileExtension,
  });
  // UPLOAD the recording file to S3
  const uploadResult = await uploadRecordingToS3(uri, fileName);
  console.log("uploadRecordingToS3:", {
    uploadResult,
  });
  if (uploadResult) {
    console.log("Uploaded to S3 with key:", fileName);
    try {
      const savedRecording = await createRecording({
        userId,
        activityId,
        scriptId,
        audioUrl: fileName, // Store S3 key for later download
        duration: audioDuration, // Replace with the actual duration value if available
        mimeType: uploadResult.mimeType,
      });
      console.log("Recording saved to DB:", savedRecording);
    } catch (err) {
      console.error("Failed to create recording entry in database:", err);
      throw err;
    }
  } else {
    console.error("S3 upload failed");
  }
};
