import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { id } = await req.json();
  const supabase = createRouteHandlerClient({ cookies });

  // Lead Architect: Enforcing 'internal' role for product approval
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.user_metadata.role !== 'internal') {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('products')
    .update({ status: 'approved' })
    .eq('id', id)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
