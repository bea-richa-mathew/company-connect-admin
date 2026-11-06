import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

export function useInternalUnreadCount() {
  return useQuery<number>({
    queryKey: ["internal-unread-count"],

    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: {
          unreadCount: number;
        };
      }>("/internal-messages/unread-count");

      return response.data.data.unreadCount;
    },

    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
}