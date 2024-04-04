import { getMAU } from "@/db/db";

export async function GET() {
  const mauCursor = await getMAU();
  const mau = await mauCursor.toArray();
  return Response.json(mau);
}
