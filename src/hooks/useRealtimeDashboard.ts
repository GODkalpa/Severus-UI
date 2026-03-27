import { useEffect, useState } from "react";
import { getBackendBaseUrl } from "@/lib/backend";

type RowId = number | string | null;
type DbRow = Record<string, unknown> & { id?: RowId };
type DashboardResponse = {
  biometrics?: DbRow[];
  action_items?: DbRow[];
  financial_ledger?: DbRow[];
};

export interface DashboardBiometric {
  id: RowId;
  metricType: string;
  value: number;
  unit: string;
  loggedAt: string | null;
}

export interface DashboardActionItem {
  id: RowId;
  title: string;
  priority: string;
  status: string;
  completed: boolean;
  dueDate: string | null;
  createdAt: string | null;
}

export interface DashboardFinancialEntry {
  id: RowId;
  amount: number;
  category: string;
  description: string;
  loggedAt: string | null;
}

const asString = (value: unknown): string => (typeof value === "string" ? value : "");
const asNullableString = (value: unknown): string | null => (typeof value === "string" ? value : null);

const asNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asId = (value: unknown): RowId =>
  typeof value === "number" || typeof value === "string" ? value : null;

const mapBiometric = (row: DbRow): DashboardBiometric => ({
  id: asId(row.id),
  metricType: asString(row.metric_type).trim().toLowerCase(),
  value: asNumber(row.value),
  unit: asString(row.unit),
  loggedAt: asNullableString(row.logged_at),
});

const mapActionItem = (row: DbRow): DashboardActionItem => {
  const status = asString(row.status) || "pending";

  return {
    id: asId(row.id),
    title: asString(row.task),
    priority: asString(row.priority) || "normal",
    status,
    completed: status === "completed",
    dueDate: asNullableString(row.due_date),
    createdAt: asNullableString(row.created_at),
  };
};

const mapFinancialEntry = (row: DbRow): DashboardFinancialEntry => ({
  id: asId(row.id),
  amount: asNumber(row.amount),
  category: asString(row.category),
  description: asString(row.description),
  loggedAt: asNullableString(row.logged_at),
});

export function useRealtimeDashboard() {
  const [biometrics, setBiometrics] = useState<DashboardBiometric[]>([]);
  const [actionQueue, setActionQueue] = useState<DashboardActionItem[]>([]);
  const [financialLedger, setFinancialLedger] = useState<DashboardFinancialEntry[]>([]);

  useEffect(() => {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      console.warn("Dashboard disabled: missing backend URL configuration.");
      return;
    }

    let isActive = true;
    let abortController: AbortController | null = null;
    const pollInterval = 30000;
    const endpoint = `${backendBaseUrl}/api/dashboard`;

    const fetchData = async () => {
      abortController?.abort();
      abortController = new AbortController();

      try {
        const response = await fetch(endpoint, { signal: abortController.signal });

        if (!response.ok) {
          throw new Error(`Dashboard request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as DashboardResponse;

        if (!isActive) {
          return;
        }

        setBiometrics((payload.biometrics ?? []).map((row) => mapBiometric(row)));
        setActionQueue((payload.action_items ?? []).map((row) => mapActionItem(row)));
        setFinancialLedger((payload.financial_ledger ?? []).map((row) => mapFinancialEntry(row)));
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (isActive) {
          console.warn("Dashboard fetch failed.", error);
        }
      } finally {
        abortController = null;
      }
    };

    void fetchData();
    const intervalId = window.setInterval(() => {
      if (!isActive) {
        return;
      }

      void fetchData();
    }, pollInterval);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      abortController?.abort();
    };
  }, []);

  return { biometrics, actionQueue, financialLedger };
}
