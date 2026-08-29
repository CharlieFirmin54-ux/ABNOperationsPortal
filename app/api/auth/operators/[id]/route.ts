import { NextResponse } from "next/server";
import { deleteFileOperator } from "@/lib/auth/operators";
import { requireAdministrator } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdministrator();
  if (!session.ok) return session.response;
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing login id." }, { status: 400 });
  }
  try {
    const result = await deleteFileOperator(decodeURIComponent(id), session.operator.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not remove that login." }, { status: 500 });
  }
}
