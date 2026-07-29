// wpapi.test.ts — Tests de los validadores puros de la API de WordPress (node:test).
// Ejecutar con: npm test  (compila y corre node --test lib/*.test.js)

import test from 'node:test';
import assert from 'node:assert';
import { tokenValido, validarHorario, validarIdSeccion, validarInfo, validarSeccion } from './wpapi';

// ── Fábricas de datos de prueba ──────────────────────────────────────

/** TextoIdiomas con el mismo texto en los 5 idiomas */
function idiomas(texto = 'Arroces', extra: Record<string, unknown> = {}) {
  return { es: texto, va: texto, en: texto, de: texto, fr: texto, ...extra };
}

function item(extra: Record<string, unknown> = {}) {
  return { nombre: idiomas('Paella'), precio: 18.5, porPersona: true, disponible: true, ...extra };
}

function seccion(extra: Record<string, unknown> = {}) {
  return { nombre: idiomas(), orden: 1, visible: true, items: [item()], ...extra };
}

function dia() {
  return { comida: { inicio: '13:00', fin: '15:30' }, cena: { inicio: '19:30', fin: '22:45' } };
}

/** Body de PUT /horario con los 7 días; cambios pisa días concretos */
function cuerpoHorario(cambios: Record<string, unknown> = {}) {
  const horario: Record<string, unknown> = {};
  for (const d of ['0', '1', '2', '3', '4', '5', '6']) horario[d] = dia();
  return { horario: { ...horario, ...cambios } };
}

/** Copia de obj sin una clave (para probar campos que faltan) */
function sin(obj: object, clave: string): Record<string, unknown> {
  const copia = { ...obj } as Record<string, unknown>;
  delete copia[clave];
  return copia;
}

// ── tokenValido ──────────────────────────────────────────────────────

test('tokenValido: acepta solo el Bearer exacto', () => {
  assert.strictEqual(tokenValido('Bearer secreto123', 'secreto123'), true);
  assert.strictEqual(tokenValido('Bearer secreto124', 'secreto123'), false); // misma longitud
  assert.strictEqual(tokenValido('Bearer corto', 'secreto123'), false); // longitud distinta
  assert.strictEqual(tokenValido('secreto123', 'secreto123'), false); // sin prefijo Bearer
  assert.strictEqual(tokenValido('bearer secreto123', 'secreto123'), false); // prefijo en minúscula
  assert.strictEqual(tokenValido(undefined, 'secreto123'), false); // sin cabecera
});

test('tokenValido: con el secret vacío nadie entra', () => {
  assert.strictEqual(tokenValido('Bearer ', ''), false); // "" == "" pero se rechaza igual
  assert.strictEqual(tokenValido('Bearer loquesea', ''), false);
  assert.strictEqual(tokenValido(undefined, ''), false);
});

// ── validarIdSeccion ─────────────────────────────────────────────────

test('validarIdSeccion: acepta solo [A-Za-z0-9_-] de 1 a 64', () => {
  assert.strictEqual(validarIdSeccion('arroces'), true);
  assert.strictEqual(validarIdSeccion('A_1-z'), true);
  assert.strictEqual(validarIdSeccion('a'), true);
  assert.strictEqual(validarIdSeccion('a'.repeat(64)), true);
  assert.strictEqual(validarIdSeccion(''), false);
  assert.strictEqual(validarIdSeccion('a'.repeat(65)), false);
  assert.strictEqual(validarIdSeccion('con espacio'), false);
  assert.strictEqual(validarIdSeccion('árbol'), false);
  assert.strictEqual(validarIdSeccion('a/b'), false); // nada de segmentos de ruta
  assert.strictEqual(validarIdSeccion('../x'), false);
  assert.strictEqual(validarIdSeccion('a.b'), false);
  assert.strictEqual(validarIdSeccion(42), false);
  assert.strictEqual(validarIdSeccion(null), false);
  assert.strictEqual(validarIdSeccion(undefined), false);
  assert.strictEqual(validarIdSeccion({}), false);
});

test('validarIdSeccion: rechaza los ids reservados de Firestore (__x__)', () => {
  assert.strictEqual(validarIdSeccion('__a__'), false);
  assert.strictEqual(validarIdSeccion('__id__'), false);
  assert.strictEqual(validarIdSeccion('____'), false);
  assert.strictEqual(validarIdSeccion('__solo_prefijo'), true); // reservado es __...__, no __...
  assert.strictEqual(validarIdSeccion('sufijo__'), true);
});

// ── validarSeccion ───────────────────────────────────────────────────

test('validarSeccion: sección válida devuelve una copia limpia, no el body', () => {
  const s = seccion();
  const r = validarSeccion(s);
  assert.deepStrictEqual(r, {
    ok: true,
    valor: {
      nombre: idiomas(),
      orden: 1,
      visible: true,
      items: [{ nombre: idiomas('Paella'), precio: 18.5, porPersona: true, disponible: true }],
    },
  });
  assert.ok(r.ok && (r.valor as unknown) !== s); // objeto nuevo, nunca el body tal cual
});

test('validarSeccion: conserva descripcion y alergenos válidos', () => {
  const r = validarSeccion(seccion({ items: [item({ descripcion: idiomas('Con caldo'), alergenos: ['crustáceos', 'marisco'] })] }));
  assert.ok(r.ok);
  assert.deepStrictEqual(r.valor.items[0].descripcion, idiomas('Con caldo'));
  assert.deepStrictEqual(r.valor.items[0].alergenos, ['crustáceos', 'marisco']);
});

test('validarSeccion: sin descripcion ni alergenos, las claves no aparecen en el limpio', () => {
  const r = validarSeccion(seccion());
  assert.ok(r.ok);
  assert.ok(!('descripcion' in r.valor.items[0]));
  assert.ok(!('alergenos' in r.valor.items[0]));
});

test('validarSeccion: rechaza lo que no sea un objeto plano', () => {
  for (const v of [null, undefined, [], 'x', 42, true]) {
    assert.strictEqual(validarSeccion(v).ok, false);
  }
  // Un body no-JSON llega como Buffer: se rechaza sin enumerar sus bytes como claves
  assert.strictEqual(validarSeccion(Buffer.alloc(1024)).ok, false);
  assert.strictEqual(validarHorario(Buffer.from('{}')).ok, false);
  assert.strictEqual(validarInfo(Buffer.from('hola')).ok, false);
});

test('validarSeccion: rechaza campos que faltan', () => {
  for (const campo of ['nombre', 'orden', 'visible', 'items']) {
    assert.strictEqual(validarSeccion(sin(seccion(), campo)).ok, false, `sin ${campo}`);
  }
  assert.strictEqual(validarSeccion(sin(item(), 'precio')).ok, false); // item sin precio, vía items
});

test('validarSeccion: rechaza claves desconocidas en todos los niveles', () => {
  assert.strictEqual(validarSeccion(seccion({ id: 'x' })).ok, false); // el id va en la URL, no en el body
  assert.strictEqual(validarSeccion(seccion({ visible2: true })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ stock: 3 })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ nombre: idiomas('x', { pt: 'x' }) })).ok, false); // idioma extra
  // __proto__ llega como clave propia con JSON.parse → clave desconocida
  const conProto = JSON.parse('{"nombre":{},"orden":1,"visible":true,"items":[],"__proto__":{"pwned":1}}');
  assert.strictEqual(validarSeccion(conProto).ok, false);
});

test('validarSeccion: nombre exige los 5 idiomas string de hasta 200', () => {
  assert.strictEqual(validarSeccion(seccion({ nombre: 'Arroces' })).ok, false); // string plano
  assert.strictEqual(validarSeccion(seccion({ nombre: sin(idiomas(), 'fr') })).ok, false); // falta idioma
  assert.strictEqual(validarSeccion(seccion({ nombre: idiomas('x', { es: 7 }) })).ok, false); // no string
  assert.strictEqual(validarSeccion(seccion({ nombre: idiomas('x'.repeat(201)) })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ nombre: idiomas('x'.repeat(200)) })).ok, true); // justo en el límite
});

test('validarSeccion: orden es un entero 0..999', () => {
  assert.strictEqual(validarSeccion(seccion({ orden: 0 })).ok, true);
  assert.strictEqual(validarSeccion(seccion({ orden: 999 })).ok, true);
  assert.strictEqual(validarSeccion(seccion({ orden: 1.5 })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ orden: -1 })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ orden: 1000 })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ orden: '3' })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ orden: NaN })).ok, false);
});

test('validarSeccion: visible es boolean estricto', () => {
  assert.strictEqual(validarSeccion(seccion({ visible: 'true' })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ visible: 1 })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ visible: false })).ok, true);
});

test('validarSeccion: items admite hasta 120 y puede ir vacío', () => {
  assert.strictEqual(validarSeccion(seccion({ items: [] })).ok, true);
  assert.strictEqual(validarSeccion(seccion({ items: Array(120).fill(item()) })).ok, true);
  assert.strictEqual(validarSeccion(seccion({ items: Array(121).fill(item()) })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: {} })).ok, false); // no array
  assert.strictEqual(validarSeccion(seccion({ items: ['paella'] })).ok, false); // item no objeto
});

test('validarSeccion: precio es un número finito ≥ 0', () => {
  assert.strictEqual(validarSeccion(seccion({ items: [item({ precio: 0 })] })).ok, true); // 0 = s/m
  assert.strictEqual(validarSeccion(seccion({ items: [item({ precio: NaN })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ precio: Infinity })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ precio: -1 })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ precio: '12' })] })).ok, false);
});

test('validarSeccion: porPersona y disponible son boolean estricto', () => {
  assert.strictEqual(validarSeccion(seccion({ items: [item({ porPersona: 'no' })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ disponible: 0 })] })).ok, false);
});

test('validarSeccion: descripcion opcional, 5 idiomas de hasta 500', () => {
  assert.strictEqual(validarSeccion(seccion({ items: [item({ descripcion: idiomas('x'.repeat(500)) })] })).ok, true);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ descripcion: idiomas('x'.repeat(501)) })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ descripcion: 'suelto' })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ descripcion: null })] })).ok, false);
});

test('validarSeccion: alergenos hasta 20 strings de hasta 40', () => {
  const veinte = Array(20).fill('a'.repeat(40));
  assert.strictEqual(validarSeccion(seccion({ items: [item({ alergenos: veinte })] })).ok, true);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ alergenos: Array(21).fill('a') })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ alergenos: ['a'.repeat(41)] })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ alergenos: [7] })] })).ok, false);
  assert.strictEqual(validarSeccion(seccion({ items: [item({ alergenos: 'gluten' })] })).ok, false); // no array
});

// ── validarHorario ───────────────────────────────────────────────────

test('validarHorario: horario válido devuelve el limpio equivalente', () => {
  const c = cuerpoHorario({ '1': { comida: null, cena: null } }); // lunes cerrado
  assert.deepStrictEqual(validarHorario(c), { ok: true, valor: c.horario });
});

test('validarHorario: el cuerpo debe ser exactamente {"horario":{...}}', () => {
  assert.strictEqual(validarHorario(null).ok, false);
  assert.strictEqual(validarHorario('horario').ok, false);
  assert.strictEqual(validarHorario({}).ok, false); // sin la clave horario
  assert.strictEqual(validarHorario({ ...cuerpoHorario(), extra: 1 }).ok, false);
  assert.strictEqual(validarHorario({ horario: [] }).ok, false);
  assert.strictEqual(validarHorario({ horario: null }).ok, false);
});

test('validarHorario: exige EXACTAMENTE los días "0".."6"', () => {
  assert.strictEqual(validarHorario({ horario: sin(cuerpoHorario().horario, '6') }).ok, false); // falta sábado
  assert.strictEqual(validarHorario(cuerpoHorario({ '7': dia() })).ok, false); // día inventado
  assert.strictEqual(validarHorario(cuerpoHorario({ lunes: dia() })).ok, false);
  assert.strictEqual(validarHorario(cuerpoHorario({ '3': null })).ok, false); // día null no vale: {comida:null,cena:null}
});

test('validarHorario: cada día lleva comida y cena, nada más', () => {
  assert.strictEqual(validarHorario(cuerpoHorario({ '2': sin(dia(), 'cena') })).ok, false);
  assert.strictEqual(validarHorario(cuerpoHorario({ '2': { ...dia(), brunch: null } })).ok, false);
});

test('validarHorario: cada turno es null o { inicio, fin } en HH:mm', () => {
  assert.strictEqual(validarHorario(cuerpoHorario({ '4': { comida: null, cena: { inicio: '20:00', fin: '23:00' } } })).ok, true);
  assert.strictEqual(validarHorario(cuerpoHorario({ '4': { comida: { inicio: '13:00' }, cena: null } })).ok, false); // sin fin
  assert.strictEqual(validarHorario(cuerpoHorario({ '4': { comida: { inicio: '13:00', fin: '15:00', tope: 1 }, cena: null } })).ok, false);
  assert.strictEqual(validarHorario(cuerpoHorario({ '4': { comida: { inicio: '24:00', fin: '25:00' }, cena: null } })).ok, false);
  assert.strictEqual(validarHorario(cuerpoHorario({ '4': { comida: { inicio: '9:00', fin: '15:00' }, cena: null } })).ok, false); // sin cero inicial
  assert.strictEqual(validarHorario(cuerpoHorario({ '4': { comida: { inicio: '13:00', fin: '13:60' }, cena: null } })).ok, false);
  assert.strictEqual(validarHorario(cuerpoHorario({ '4': { comida: { inicio: 1300, fin: 1500 }, cena: null } })).ok, false); // números
  assert.strictEqual(validarHorario(cuerpoHorario({ '4': { comida: 'cerrado', cena: null } })).ok, false);
});

test('validarHorario: inicio debe ser anterior a fin', () => {
  assert.strictEqual(validarHorario(cuerpoHorario({ '5': { comida: { inicio: '13:00', fin: '13:00' }, cena: null } })).ok, false);
  assert.strictEqual(validarHorario(cuerpoHorario({ '5': { comida: { inicio: '15:00', fin: '13:00' }, cena: null } })).ok, false);
  assert.strictEqual(validarHorario(cuerpoHorario({ '5': { comida: { inicio: '00:00', fin: '23:59' }, cena: null } })).ok, true);
});

// ── validarInfo ──────────────────────────────────────────────────────

test('validarInfo: acepta {"infoPractica": string ≤ 10000} y devuelve el string', () => {
  assert.deepStrictEqual(validarInfo({ infoPractica: 'Parking gratis al lado' }), { ok: true, valor: 'Parking gratis al lado' });
  assert.strictEqual(validarInfo({ infoPractica: '' }).ok, true); // vaciar es legítimo
  assert.strictEqual(validarInfo({ infoPractica: 'x'.repeat(10000) }).ok, true);
});

test('validarInfo: rechaza tipos raros, exceso y claves extra', () => {
  assert.strictEqual(validarInfo({ infoPractica: 'x'.repeat(10001) }).ok, false);
  assert.strictEqual(validarInfo({ infoPractica: 42 }).ok, false);
  assert.strictEqual(validarInfo({ infoPractica: null }).ok, false);
  assert.strictEqual(validarInfo({ infoPractica: ['x'] }).ok, false);
  assert.strictEqual(validarInfo({}).ok, false);
  assert.strictEqual(validarInfo({ infoPractica: 'x', horario: {} }).ok, false); // no cuela otro campo
  assert.strictEqual(validarInfo('texto suelto').ok, false);
  assert.strictEqual(validarInfo(null).ok, false);
});
