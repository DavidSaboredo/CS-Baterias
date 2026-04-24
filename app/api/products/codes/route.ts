import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const auth = (await cookies()).get('auth_session')?.value === 'authenticated';
  const inventoryKey = req.headers.get('x-inventory-key') || new URL(req.url).searchParams.get('key');
  const requiredKey = process.env.INVENTORY_API_KEY;

  const hasKey = !!requiredKey && inventoryKey === requiredKey;
  if (!auth && !hasKey) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get('limit') || '');
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 200, 1), auth ? 2000 : 500);
  const cursorRaw = url.searchParams.get('cursor');
  const cursorId = cursorRaw ? Number(cursorRaw) : null;

  try {
    const products = await prisma.product.findMany({
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      take: limit,
      orderBy: [{ id: 'asc' }],
      select: ({
        id: true,
        brand: true,
        model: true,
        amperage: true,
        stock: true,
        minStock: true,
        price: true,
        codigoAleatorio: true,
        updatedAt: true,
      } as any),
    });

    const nextCursor = products.length === limit ? products[products.length - 1].id : null;
    const res = NextResponse.json({ products, nextCursor });
    if (!auth) {
      res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    }
    return res;
  } catch (e: any) {
    if (e?.code === 'P1001') {
      return NextResponse.json({ error: 'No se pudo conectar a la base de datos.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Error al listar productos.' }, { status: 500 });
  }
}
