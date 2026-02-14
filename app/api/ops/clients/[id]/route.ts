import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/ops/clients/:id -- Get client details with health history
// Status: STUB -- returns 501 until ops dashboard is implemented
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
  void id;

  // TODO: Implement when managing 5+ clients
  return NextResponse.json(
    { error: 'Ops dashboard not yet implemented. Deploy migration 08_ops_dashboard.sql first.' },
    { status: 501 }
  );
}
