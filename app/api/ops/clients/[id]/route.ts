import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOpsClient } from '@/lib/ops/config';

// GET /api/ops/clients/:id -- Get client details with health history and billing events
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ops = getOpsClient();

  // Fetch client details
  const { data: client, error: clientError } = await ops
    .from('ops_clients')
    .select('*')
    .eq('id', id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Fetch health history (last 30 checks)
  const { data: healthHistory } = await ops
    .from('ops_client_health')
    .select('*')
    .eq('client_id', id)
    .order('checked_at', { ascending: false })
    .limit(30);

  // Fetch billing events (last 50)
  const { data: billingEvents } = await ops
    .from('ops_billing_events')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    client,
    healthHistory: healthHistory || [],
    billingEvents: billingEvents || [],
  });
}
