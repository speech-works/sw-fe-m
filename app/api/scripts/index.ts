import { User } from "../users";
import { API_BASE_URL } from "../constants";

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

// get all scripts
export const getAllScripts = async (
  createdByUser?: string
): Promise<Script[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/scripts?createdBy=${createdByUser}`
    );
    const scripts = await response.json();
    return scripts;
  } catch (error) {
    console.error(
      "There was a problem with the get all scripts operation:",
      error
    );
    throw error;
  }
};

// get a script by id
export const getScriptById = async (
  id: string
): Promise<Script | { error: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/scripts/${id}`);
    const script = await response.json();
    return script;
  } catch (error) {
    console.error(
      "There was a problem with the get script by id operation:",
      error
    );
    throw error;
  }
};

// create a script

interface CreateScriptReq {
  name: string;
  content: string;
  source?: string;
  imageUrl?: string;
  createdBy?: string;
}
export const createScript = async ({
  name,
  content,
  source,
  imageUrl,
  createdBy,
}: CreateScriptReq): Promise<Script | { error: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/scripts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, content, source, imageUrl, createdBy }),
    });
    const script = await response.json();
    return script;
  } catch (error) {
    console.error(
      "There was a problem with the create script operation:",
      error
    );
    throw error;
  }
};

// update a script
interface UpdateScriptReq {
  name?: string;
  content?: string;
  source?: string;
  imageUrl?: string;
}
export const updateScript = async (
  scriptId: string,
  { name, content, source, imageUrl }: UpdateScriptReq
): Promise<Script | { error: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/scripts/${scriptId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, content, source, imageUrl }),
    });
    const script = await response.json();
    return script;
  } catch (error) {
    console.error(
      "There was a problem with the update script operation:",
      error
    );
    throw error;
  }
};

// delete a script
export const deleteScript = async (
  scriptId: string
): Promise<Script | { error: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/scripts/${scriptId}`, {
      method: "DELETE",
    });
    const script = await response.json();
    return script;
  } catch (error) {
    console.error(
      "There was a problem with the delete script operation:",
      error
    );
    throw error;
  }
};
