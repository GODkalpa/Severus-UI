import { useEffect, useState } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type RowId = number | string | null;
type DbRow = Record<string, unknown> & { id?: RowId };

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

const upsertById = <T extends { id: RowId }>(items: T[], nextItem: T) => {
  if (nextItem.id == null) {
    return [nextItem, ...items];
  }

  const index = items.findIndex((item) => item.id === nextItem.id);
  if (index === -1) {
    return [nextItem, ...items];
  }

  const updated = [...items];
  updated[index] = nextItem;
  return updated;
};

const removeById = <T extends { id: RowId }>(items: T[], id: RowId) => {
  if (id == null) {
    return items;
  }

  return items.filter((item) => item.id !== id);
};

const getRetryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 10000);

export function useRealtimeDashboard() {
  const [biometrics, setBiometrics] = useState<DashboardBiometric[]>([]);
  const [actionQueue, setActionQueue] = useState<DashboardActionItem[]>([]);
  const [financialLedger, setFinancialLedger] = useState<DashboardFinancialEntry[]>([]);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      console.warn("Supabase dashboard disabled: missing public environment variables.");
      return;
    }

    let isActive = true;
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];

      try {
        const [
          { data: bioData, error: bioError },
          { data: actionData, error: actionError },
          { data: financeData, error: financeError },
        ] = await Promise.all([
          client
            .from("biometrics")
            .select("*")
            .gte("logged_at", today)
            .order("logged_at", { ascending: false }),
          client
            .from("action_items")
            .select("*")
            .order("created_at", { ascending: false }),
          client
            .from("financial_ledger")
            .select("*")
            .gte("logged_at", today)
            .order("logged_at", { ascending: false }),
        ]);

        if (!isActive) {
          return;
        }

        const firstError = bioError ?? actionError ?? financeError;
        if (firstError) {
          console.warn("Supabase dashboard fetch failed.", firstError);
          return;
        }

        setBiometrics((bioData ?? []).map((row) => mapBiometric(row as DbRow)));
        setActionQueue((actionData ?? []).map((row) => mapActionItem(row as DbRow)));
        setFinancialLedger((financeData ?? []).map((row) => mapFinancialEntry(row as DbRow)));
      } catch (error) {
        if (isActive) {
          console.warn("Supabase dashboard fetch failed.", error);
        }
      }
    };

    const scheduleReconnect = (reason: string, details?: unknown) => {
      if (!isActive || reconnectTimer) {
        return;
      }

      const delay = getRetryDelay(reconnectAttempts);
      reconnectAttempts += 1;
      console.warn(`Supabase realtime reconnect scheduled: ${reason}`, details);

      if (channel) {
        void client.removeChannel(channel);
        channel = null;
      }

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void fetchData();
        subscribe();
      }, delay);
    };

    const handleBiometricsChange = (payload: RealtimePostgresChangesPayload<DbRow>) => {
      if (payload.eventType === "DELETE") {
        setBiometrics((prev) => removeById(prev, asId(payload.old.id)));
        return;
      }

      const nextItem = mapBiometric(payload.new);
      setBiometrics((prev) => upsertById(prev, nextItem));
    };

    const handleActionItemsChange = (payload: RealtimePostgresChangesPayload<DbRow>) => {
      if (payload.eventType === "DELETE") {
        setActionQueue((prev) => removeById(prev, asId(payload.old.id)));
        return;
      }

      const nextItem = mapActionItem(payload.new);
      setActionQueue((prev) => upsertById(prev, nextItem));
    };

    const handleFinancialChange = (payload: RealtimePostgresChangesPayload<DbRow>) => {
      if (payload.eventType === "DELETE") {
        setFinancialLedger((prev) => removeById(prev, asId(payload.old.id)));
        return;
      }

      const nextItem = mapFinancialEntry(payload.new);
      setFinancialLedger((prev) => upsertById(prev, nextItem));
    };

    const subscribe = () => {
      if (!isActive) {
        return;
      }

      channel = client
        .channel("severus-telemetry")
        .on("postgres_changes", { event: "*", schema: "public", table: "biometrics" }, handleBiometricsChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "action_items" }, handleActionItemsChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "financial_ledger" }, handleFinancialChange)
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            reconnectAttempts = 0;
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            scheduleReconnect(`subscription ${status.toLowerCase()}`, err);
          }
        });
    };

    void fetchData();
    subscribe();

    return () => {
      isActive = false;
      clearReconnectTimer();

      if (channel) {
        void client.removeChannel(channel);
      }
    };
  }, []);

  return { biometrics, actionQueue, financialLedger };
}
