export const handle401Error = (error: Error, logout: () => void) => {
  if (error.cause === 401) {
    logout();
  }
  return;
};
