ALTER TABLE "Product" ADD COLUMN "codigo_aleatorio" CHAR(3);

CREATE OR REPLACE FUNCTION public.generate_codigo_aleatorio_3()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  out text := '';
  idx int;
BEGIN
  WHILE length(out) < 3 LOOP
    idx := floor(random() * 36)::int;
    out := out || substr(chars, idx + 1, 1);
  END LOOP;
  RETURN out;
END;
$$;

DO $$
DECLARE
  r record;
  code text;
  tries int;
BEGIN
  FOR r IN SELECT id FROM "Product" WHERE "codigo_aleatorio" IS NULL LOOP
    tries := 0;
    LOOP
      tries := tries + 1;
      IF tries > 1000 THEN
        RAISE EXCEPTION 'No se pudo generar codigo_aleatorio único para Product id=%', r.id;
      END IF;
      code := public.generate_codigo_aleatorio_3();
      PERFORM 1 FROM "Product" WHERE "codigo_aleatorio" = code;
      IF NOT FOUND THEN
        UPDATE "Product" SET "codigo_aleatorio" = code WHERE id = r.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE "Product" ALTER COLUMN "codigo_aleatorio" SET NOT NULL;

CREATE UNIQUE INDEX "Product_codigoAleatorio_key" ON "Product"("codigo_aleatorio");

DROP FUNCTION public.generate_codigo_aleatorio_3();
