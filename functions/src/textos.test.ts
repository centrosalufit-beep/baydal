// textos.test.ts — Contrato de idiomas: cada clave con los 5 idiomas
// completos (es/va/en/de/fr), sin vacíos y con los mismos parámetros {x}.

import test from 'node:test';
import assert from 'node:assert';
import { TEXTOS } from './textos';

const IDIOMAS = ['de', 'en', 'es', 'fr', 'va']; // orden alfabético para comparar

const marcadores = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('cada clave de textos tiene exactamente los 5 idiomas, sin vacíos', () => {
  for (const [clave, porIdioma] of Object.entries(TEXTOS)) {
    assert.deepStrictEqual(Object.keys(porIdioma).sort(), IDIOMAS, `clave "${clave}"`);
    for (const [idioma, texto] of Object.entries(porIdioma)) {
      assert.ok(String(texto).trim().length > 0, `"${clave}.${idioma}" está vacío`);
    }
  }
});

test('los parámetros {x} coinciden en los 5 idiomas de cada clave', () => {
  for (const [clave, porIdioma] of Object.entries(TEXTOS)) {
    const esperado = marcadores(porIdioma.es);
    for (const [idioma, texto] of Object.entries(porIdioma)) {
      assert.deepStrictEqual(marcadores(String(texto)), esperado, `"${clave}.${idioma}"`);
    }
  }
});
