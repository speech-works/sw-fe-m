import Toast, { ToastType } from "react-native-toast-message";

export const handle401Error = (error: Error, logout: () => void) => {
  if (error.cause === 401) {
    logout();
    triggerToast("error", "Session Timeout", "Please login again");
  }
  return;
};

export const triggerToast = (type: ToastType, title: string, desc: string) => {
  Toast.show({
    type,
    text1: title,
    text2: desc,
  });
};
