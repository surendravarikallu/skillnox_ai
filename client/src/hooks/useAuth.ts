import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      // Get token from localStorage or cookie
      const token = localStorage.getItem("token");
      
      const response = await fetch("/api/auth/user", {
        credentials: "include",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          return null;
        }
        throw new Error("Failed to fetch user");
      }

      return response.json();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
  };
}
