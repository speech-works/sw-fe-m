export const handleErrorsIfAny = async (response: Response) => {
  if (!response.ok) {
    const e = new Error();
    e.cause = response.status;
    e.message = `HTTP error! Status: ${response.status}`;
    throw e;
  }
  const resJson = await response.json();
  if ("error" in resJson) {
    throw new Error(`Error from the backend: ${resJson.error}`);
  }
  return resJson;
};
