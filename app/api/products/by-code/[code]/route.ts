import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeProductCode, PRODUCT_CODE_REGEX } from '@/lib/product-code.js';
import { cookies } from 'next/headers';

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const auth = (await cookies()).get('auth_session')?.value === 'authenticated';
  const inventoryKey = req.headers.get('x-inventory-key') || new URL(req.url).searchParams.get('key');
  const requiredKey = process.env.INVENTORY_API_KEY;
  const hasKey = !!requiredKey && inventoryKey === requiredKey;
  if (!auth && !hasKey) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { code } = await ctx.params;
  const codigoAleatorio = normalizeProductCode(code);

  if (!PRODUCT_CODE_REGEX.test(codigoAleatorio)) {
    return NextResponse.json(
      { error: 'Formato inválido. Se esperan 3 caracteres alfanuméricos (A-Z, 0-9).' },
      { status: 400 },
    );
  }

  let product: any = null;
  try {
    product = await prisma.product.findUnique({
      where: { codigoAleatorio },
      select: {
        id: true,
        brand: true,
        model: true,
        amperage: true,
        stock: true,
        minStock: true,
        price: true,
        codigoAleatorio: true,
      },
    });
  } catch (e: any) {
    if (e?.code === 'P1001') {
      return NextResponse.json({ error: 'No se pudo conectar a la base de datos.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Error al buscar producto.' }, { status: 500 });
  }

  if (!product) {
    return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
  }

  const res = NextResponse.json({ product });
  if (!auth) {
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  }
  return res;
}
