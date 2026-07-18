import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { scans, violations } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const scan = await db.select().from(scans).where(eq(scans.id, id)).get();

  if (!scan) {
    return Response.json({ error: 'Scan not found' }, { status: 404 });
  }

  const scanViolations = await db
    .select()
    .from(violations)
    .where(eq(violations.scanId, id))
    .all();

  return Response.json({ ...scan, violations: scanViolations });
}
