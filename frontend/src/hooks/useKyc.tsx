import { useMutation } from "@tanstack/react-query";

import { api } from "../lib/api";

type StartKycResponse = {
  url: string;
};

export function useStartKyc() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<StartKycResponse>("/kyc/start");
      return data;
    },
    onSuccess: (data) => {
      if (!data.url) return;
      const opened = window.open(data.url, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.assign(data.url);
      }
    },
  });
}

