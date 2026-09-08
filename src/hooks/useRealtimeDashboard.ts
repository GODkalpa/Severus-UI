import { useEffect, useState } from "react";
import { getBackendBaseUrl } from "@/lib/backend";

type RowId = number | string | null;
type DbRow = Record<string, unknown> & { id?: RowId };
type DashboardResponse = {
  biometrics?: DbRow[];
  action_items?: DbRow[];
  financial_ledger?: DbRow[];
  reminders?: DbRow[];
};

export interface DashboardBiometric {
  id: RowId;
  metricType: string;
  value: number;
  unit: string;
  loggedAt: string | null;
}

export interface DashboardReminder {
  id: RowId;
  reminderText: string;
  isOneOff: boolean;
  intervalHours: number | null;
  dueAt: string | null;
  isActive: boolean;
  createdAt: string | null;
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

const mapReminder = (row: DbRow): DashboardReminder => ({
  id: asId(row.id),
  reminderText: asString(row.reminder_text),
  isOneOff: Boolean(row.is_one_off),
  intervalHours: row.interval_hours != null ? asNumber(row.interval_hours) : null,
  dueAt: asNullableString(row.due_at),
  isActive: Boolean(row.is_active ?? true),
  createdAt: asNullableString(row.created_at),
});

export function useRealtimeDashboard(sessionToken: string = "", onAuthError?: () => void) {
  const [biometrics, setBiometrics] = useState<DashboardBiometric[]>([]);
  const [actionQueue, setActionQueue] = useState<DashboardActionItem[]>([]);
  const [reminders, setReminders] = useState<DashboardReminder[]>([]);
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
    const endpoint = `${backendBaseUrl}/api/dashboard?token=${sessionToken}`;

    const fetchData = async () => {
      if (!sessionToken) return; // Don't fetch without token
      
      abortController?.abort();
      abortController = new AbortController();

      try {
        const response = await fetch(endpoint, { signal: abortController.signal });

        if (!response.ok) {
          if (response.status === 401) {
            onAuthError?.();
          }
          throw new Error(`Dashboard request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as DashboardResponse;

        if (!isActive) {
          return;
        }

        setBiometrics((payload.biometrics ?? []).map((row) => mapBiometric(row)));
        setActionQueue((payload.action_items ?? []).map((row) => mapActionItem(row)));
        setFinancialLedger((payload.financial_ledger ?? []).map((row) => mapFinancialEntry(row)));
        setReminders((payload.reminders ?? []).map((row) => mapReminder(row)));
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
    }, 10000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      abortController?.abort();
    };
  }, [sessionToken]);

  return { biometrics, actionQueue, reminders, financialLedger };
}
