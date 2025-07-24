import axiosClient from "../../axiosClient";

export const transcribeAudio = async (audioFileUrlKey: string) => {
  const res = await axiosClient.post("/stt/transcribe", {
    audioFileUrlKey,
  });
  return res.data; // { transcript: string }
};
