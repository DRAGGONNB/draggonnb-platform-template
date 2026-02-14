import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/ops/clients -- List all provisioned clients
// Status: STUB -- returns 501 until ops dashboard is implemented
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Implement when managing 5+ clients
  // Will query ops_clients table with filters for tier, health, billing status
  return NextResponse.json(
    { error: 'Ops dashboard not yet implemented. Deploy migration 08_ops_dashboard.sql first.' },
    { status: 501 }
  );
}
