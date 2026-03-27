import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeDashboard() {
  const [biometrics, setBiometrics] = useState<any[]>([]);
  const [actionQueue, setActionQueue] = useState<any[]>([]);
  const [financialLedger, setFinancialLedger] = useState<any[]>([]);

  useEffect(() => {
    // 1. Initial Fetch
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: bioData } = await supabase
        .from('biometrics')
        .select('*')
        .gte('logged_at', today);
      if (bioData) setBiometrics(bioData);

      const { data: actionData } = await supabase
        .from('action_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (actionData) setActionQueue(actionData);

      const { data: financeData } = await supabase
        .from('financial_ledger')
        .select('*')
        .gte('logged_at', today);
      if (financeData) setFinancialLedger(financeData);
    };

    fetchData();

    // 2. Realtime Subscription
    const channel = supabase
      .channel('severus-telemetry')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'biometrics' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBiometrics((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setBiometrics((prev) =>
              prev.map((item) => (item.id === payload.new.id ? payload.new : item))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'action_items' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setActionQueue((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setActionQueue((prev) =>
              prev.map((item) => (item.id === payload.new.id ? payload.new : item))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financial_ledger' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFinancialLedger((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setFinancialLedger((prev) =>
              prev.map((item) => (item.id === payload.new.id ? payload.new : item))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { biometrics, actionQueue, financialLedger };
}
