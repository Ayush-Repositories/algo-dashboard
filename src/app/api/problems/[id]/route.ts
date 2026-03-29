import { NextResponse } from 'next/server';
import { initDB, execute } from '@/lib/db';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id } = await params;
  await execute('DELETE FROM problems WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
