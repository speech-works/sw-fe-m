let updateTokenFn: ((token: string) => void) | null = null;

export function setUpdateTokenFn(fn: (token: string) => void) {
  updateTokenFn = fn;
}

export function getUpdateTokenFn() {
  return updateTokenFn;
}
