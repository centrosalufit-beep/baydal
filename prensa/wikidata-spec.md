# Especificación del ítem de Wikidata "Restaurante Baydal"
# Crear en https://www.wikidata.org (requiere cuenta; la creación de ítems pide
# cuenta con 4 días y 50 ediciones — alternativa: proponerlo en Wikidata:Item requests).
# Declarar el conflicto de interés en la página de usuario (transparencia).

Etiqueta (es): Restaurante Baydal
Descripción (es): restaurante del puerto de Calp fundado en 1941, donde se creó el arròs del senyoret
Etiqueta (ca): Restaurant Baydal
Descripción (ca): restaurant del port de Calp fundat el 1941, on es va crear l'arròs del senyoret
Etiqueta (en): Restaurante Baydal
Descripción (en): restaurant on Calpe harbour founded in 1941, birthplace of arròs del senyoret

## Declaraciones (propiedad → valor → referencia)
- instancia de (P31) → restaurante (Q11707)
- país (P17) → España (Q29)
- situado en la entidad territorial administrativa (P131) → Calp (Q485240)
- coordenadas (P625) → 38.6366, 0.0706
- fecha de fundación (P571) → julio 1941
  REF: https://calpdigital.es/art/6162/el-restaurante-baydal-de-calpe-celebra-su-80-aniversario
  REF: https://lamarina.eldiario.es/2025/05/14/memoria-de-calp-jaime-baydal-crespo-1935-2025-restaurante-baydal-del-puerto-la-roca-y-la-excelencia/
- sitio web oficial (P856) → https://baydal.es
- dirección (P6375) → Avinguda del Port, 10, 03710 Calp, Alicante
- conocido por → arròs del senyoret  [enlazar con el ítem del plato si existe;
  el artículo ca:Arròs_del_senyoret ya cita al Baydal como creador]
  REF: À Punt (16/09/2021) y ca.wikipedia.org/wiki/Arròs_del_senyoret

## NO hacer
- No editar el artículo de la Viquipèdia directamente (conflicto de interés;
  ya dice lo que necesitamos). Si algo se corrige, proponerlo en la discusión.
- No inventar fecha exacta de la invención del plato (fuentes discrepan: 60s/80s).

## Después de crear el ítem
- Añadir "sameAs": ["<URL del ítem Q>"] al schema Restaurant de build.py
- Enlazarlo también a la ficha de Google (misma entidad) vía el campo web
