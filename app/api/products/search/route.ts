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
  const q = (url.searchParams.get('q') || '').trim();

  if (q.length < 2) {
    return NextResponse.json({ error: 'Query demasiado corto.' }, { status: 400 });
  }

  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      where: {
        OR: [
          { brand: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
          { amperage: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
      take: 30,
      select: ({
        id: true,
        brand: true,
        model: true,
        amperage: true,
        stock: true,
        minStock: true,
        price: true,
        codigoAleatorio: true,
      } as any),
    });
  } catch (e: any) {
    if (e?.code === 'P1001') {
      return NextResponse.json({ error: 'No se pudo conectar a la base de datos.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Error al buscar productos.' }, { status: 500 });
  }

  const res = NextResponse.json({ products });
  if (!auth) {
    res.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
  }
  return res;
}
