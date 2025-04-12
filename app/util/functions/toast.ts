import Toast, { ToastType } from "react-native-toast-message";

export const triggerToast = (type: ToastType, title: string, desc: string) => {
  Toast.show({
    type,
    text1: title,
    text2: desc,
  });
};
