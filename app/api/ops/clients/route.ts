import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOpsClient } from '@/lib/ops/config';

// GET /api/ops/clients -- List all provisioned clients with optional filters
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ops = getOpsClient();
  const { searchParams } = request.nextUrl;

  // Optional filters
  const tier = searchParams.get('tier');
  const health = searchParams.get('health');
  const billing = searchParams.get('billing');

  let query = ops
    .from('ops_clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (tier) query = query.eq('tier', tier);
  if (health) query = query.eq('health_status', health);
  if (billing) query = query.eq('billing_status', billing);

  const { data: clients, error } = await query;

  if (error) {
    console.error('[Ops] Failed to fetch clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }

  // Compute billing summary
  const allClients = clients || [];
  const summary = {
    total_clients: allClients.length,
    active_clients: allClients.filter((c: Record<string, unknown>) => c.billing_status === 'active').length,
    clients_by_tier: allClients.reduce((acc: Record<string, number>, c: Record<string, unknown>) => {
      const t = (c.tier as string) || 'unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    clients_by_health: allClients.reduce((acc: Record<string, number>, c: Record<string, unknown>) => {
      const h = (c.health_status as string) || 'unknown';
      acc[h] = (acc[h] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return NextResponse.json({ clients: allClients, summary });
}
