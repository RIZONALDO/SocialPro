import { useQuery } from "@tanstack/react-query";
import type { WeeklyReport } from "./generated/api.schemas";
import { customFetch } from "./custom-fetch";

export function getGetMonthlyReportQueryKey(params?: { monthOf?: string }) {
  return ["reports", "monthly", params?.monthOf] as const;
}

export function useGetMonthlyReport(
  params?: { monthOf?: string },
  options?: { query?: { enabled?: boolean } }
) {
  return useQuery<WeeklyReport>({
    queryKey: getGetMonthlyReportQueryKey(params),
    queryFn: () => {
      const url = params?.monthOf
        ? `/api/reports/monthly?monthOf=${params.monthOf}`
        : "/api/reports/monthly";
      return customFetch<WeeklyReport>(url);
    },
    ...options?.query,
  });
}
