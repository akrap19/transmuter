"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      richColors
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "tm-toast",
          title: "tm-toast-title",
          description: "tm-toast-description",
          success: "tm-toast-success",
          error: "tm-toast-error",
          closeButton: "tm-toast-close",
        },
      }}
    />
  );
}
