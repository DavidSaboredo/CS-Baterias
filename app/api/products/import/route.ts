import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProductWithUniqueCode } from '@/lib/product-code.server';
import { cookies } from 'next/headers';

function parseCsv(content: string) {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { headers: [], rows: [] as string[][] };

  const first = lines[0];
  const delimiter = first.includes(';') && !first.includes(',') ? ';' : ',';

  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function toNumber(value: string | undefined, fallback: number) {
  if (value == null) return fallback;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: Request) {
  const auth = (await cookies()).get('auth_session')?.value === 'authenticated';
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const modeRaw = (formData.get('mode') || 'upsert').toString().toLowerCase();
  const mode = modeRaw === 'prices' ? 'prices' : modeRaw === 'stock' ? 'stock' : 'upsert';
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo faltante.' }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv')) {
    return NextResponse.json(
      { error: 'Formato no soportado. Exportá tu Excel como .csv.' },
      { status: 400 },
    );
  }

  const content = await file.text();
  const { headers, rows } = parseCsv(content);
  const idx = (key: string) => headers.indexOf(key);

  const brandI = idx('brand') >= 0 ? idx('brand') : idx('marca');
  const modelI = idx('model') >= 0 ? idx('model') : idx('modelo');
  const amperageI = idx('amperage') >= 0 ? idx('amperage') : idx('amperaje');
  const stockI = idx('stock');
  const minStockI = idx('minstock') >= 0 ? idx('minstock') : idx('stockminimo');
  const priceI = idx('price') >= 0 ? idx('price') : idx('precio');

  if (brandI < 0 || modelI < 0) {
    return NextResponse.json(
      { error: 'CSV inválido. Debe incluir columnas brand/marca y model/modelo.' },
      { status: 400 },
    );
  }

  let created = 0;
  let updated = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    const brand = (row[brandI] || '').trim();
    const model = (row[modelI] || '').trim();
    const amperage = (amperageI >= 0 ? row[amperageI] : '') || '';
    const stockToAdd = stockI >= 0 ? Math.trunc(toNumber(row[stockI], 0)) : 0;
    const minStock = minStockI >= 0 ? Math.trunc(toNumber(row[minStockI], 5)) : 5;
    const price = priceI >= 0 ? toNumber(row[priceI], 0) : 0;

    if (!brand || !model) {
      errors.push({ row: r + 2, error: 'Faltan brand/marca o model/modelo.' });
      continue;
    }
    if (mode !== 'stock' && !(price > 0)) {
      errors.push({ row: r + 2, error: 'Precio inválido (debe ser > 0).' });
      continue;
    }

    try {
      const existing = await prisma.product.findFirst({
        where: {
          brand: { equals: brand, mode: 'insensitive' },
          model: { equals: model, mode: 'insensitive' },
          amperage: { equals: amperage, mode: 'insensitive' },
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...(mode !== 'prices' ? { stock: { increment: stockToAdd } } : {}),
            ...(mode !== 'stock' ? { price } : {}),
            ...(mode !== 'stock' ? { minStock } : {}),
          },
        });
        updated += 1;
      } else {
        if (mode === 'prices') {
          errors.push({ row: r + 2, error: 'No existe el producto para actualizar precio.' });
          continue;
        }
        if (mode === 'stock' && !(price > 0)) {
          errors.push({ row: r + 2, error: 'No existe el producto y falta price/precio para crearlo.' });
          continue;
        }
        await createProductWithUniqueCode(prisma, {
          brand,
          model,
          amperage,
          stock: stockToAdd,
          minStock,
          price,
        });
        created += 1;
      }
    } catch (e: any) {
      if (e?.code === 'P1001') {
        return NextResponse.json({ error: 'No se pudo conectar a la base de datos.' }, { status: 503 });
      }
      errors.push({ row: r + 2, error: e?.message || 'Error al importar fila.' });
    }
  }

  return NextResponse.json({ mode, created, updated, errorsCount: errors.length, errors });
}
