import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const auth = (await cookies()).get('auth_session')?.value === 'authenticated';
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const password = (body?.password || '').toString();
  const percent = Number(body?.percent);

  if (password !== 'santino230525') {
    return NextResponse.json({ error: 'Contraseña de administrador incorrecta' }, { status: 401 });
  }

  if (!Number.isFinite(percent) || percent === 0) {
    return NextResponse.json({ error: 'Porcentaje inválido.' }, { status: 400 });
  }

  const factor = 1 + percent / 100;

  let updated = 0;
  try {
    updated = await prisma.$executeRaw`
      UPDATE "Product"
      SET "price" = ROUND(("price" * ${factor})::numeric, 2)::double precision
    `;
  } catch (e: any) {
    if (e?.code === 'P1001') {
      return NextResponse.json({ error: 'No se pudo conectar a la base de datos.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Error al aplicar ajuste.' }, { status: 500 });
  }

  return NextResponse.json({ updated, factor });
}
