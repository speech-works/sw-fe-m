// api/scripts.ts
import axiosClient from "../axiosClient";
import { User } from "../users";

export interface Script {
  id: string;
  name: string;
  content: string;
  source: string;
  imageUrl: string;
  createdBy: User | null;
  createdAt: Date;
  updatedAt: Date;
}

// Get all scripts (optionally filtering by creator)
export const getAllScripts = async (
  createdByUser?: string
): Promise<Script[]> => {
  try {
    const response = await axiosClient.get("/scripts", {
      params: { createdBy: createdByUser },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting all scripts:", error);
    throw error;
  }
};

// Get a script by ID
export const getScriptById = async (id: string): Promise<Script> => {
  try {
    const response = await axiosClient.get(`/scripts/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error getting script by ID:", error);
    throw error;
  }
};

interface CreateScriptReq {
  name: string;
  content: string;
  source?: string;
  imageUrl?: string;
  createdBy?: string;
}

// Create a script
export const createScript = async ({
  name,
  content,
  source,
  imageUrl,
  createdBy,
}: CreateScriptReq): Promise<Script> => {
  try {
    const response = await axiosClient.post("/scripts", {
      name,
      content,
      source,
      imageUrl,
      createdBy,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating script:", error);
    throw error;
  }
};

interface UpdateScriptReq {
  name?: string;
  content?: string;
  source?: string;
  imageUrl?: string;
}

// Update a script
export const updateScript = async (
  scriptId: string,
  { name, content, source, imageUrl }: UpdateScriptReq
): Promise<Script> => {
  try {
    const response = await axiosClient.patch(`/scripts/${scriptId}`, {
      name,
      content,
      source,
      imageUrl,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating script:", error);
    throw error;
  }
};

// Delete a script
export const deleteScript = async (scriptId: string): Promise<Script> => {
  try {
    const response = await axiosClient.delete(`/scripts/${scriptId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting script:", error);
    throw error;
  }
};
