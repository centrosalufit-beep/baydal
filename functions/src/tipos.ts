// tipos.ts — Interfaces del contrato de datos (SCHEMA.md v1 "Paco").
// Solo tipos: este módulo no genera código en tiempo de ejecución.

import type { Timestamp } from 'firebase-admin/firestore';

/** Idiomas soportados por el bot */
export type Idioma = 'es' | 'va' | 'en' | 'de' | 'fr';

/** Turnos del restaurante */
export type Turno = 'comida' | 'cena';

/** Rango de horas de ENTRADA aceptadas (fin = última entrada, no cierre de cocina) */
export interface RangoHoras {
  inicio: string; // HH:mm
  fin: string;    // HH:mm
}

/** Horario de un día de la semana; null = turno cerrado */
export interface HorarioDia {
  comida: RangoHoras | null;
  cena: RangoHoras | null;
}

/** config/restaurante (doc único) */
export interface Config {
  nombre: string;             // "Restaurante Baydal"
  nombreBot: string;          // "Paco"
  telefonoHumano: string;     // teléfono que Paco da para llamar
  whatsappHumano: string;     // WhatsApp de recepción (escalados, avisos, resumen)
  botActivo: boolean;         // false = mensaje de cortesía y fin
  antelacionMaxDias: number;  // hasta cuándo se puede reservar
  antelacionMinHoras: number; // margen mínimo antes de la hora de entrada
  slotMinutos: number;        // granularidad de horas ofertadas
  maxComensalesBot: number;   // 20 — por encima, flujo GRUPO_DATOS
  maxReservasActivas: number; // reservas futuras vivas por teléfono vía bot
  cortesiaMin: number;        // "te guardamos la mesa {n} min" (solo texto)
  atencionHumana: RangoHoras; // fuera de esta franja, los escalados van al buzón
  enlaceResenas: string;      // URL directa de reseña Google
  infoPractica: string;       // única fuente de Claude para dudas prácticas
  ubicacion: { lat: number; lng: number; direccion: string }; // pin al confirmar
  horario: { [dia: string]: HorarioDia }; // clave "0"(domingo).."6"(sábado)
  // Aviso puntual tras confirmar una CENA de esa fecha (menús especiales:
  // Nit del Foc, Nochevieja…). Clave YYYY-MM-DD. Vive en config para poder
  // ponerlo y quitarlo sin desplegar; ausente = no se avisa de nada.
  avisosPorFecha?: { [fecha: string]: TextoIdiomas };
  // Garantía: retención en tarjeta (Teya) por reserva del bot. Ausente o
  // activa:false = sin garantía. Ver docs/GARANTIA.md.
  garantia?: { activa: boolean; importe: number }; // importe en EUR por reserva
}

/** Garantía de una reserva: retención en tarjeta vía Teya (docs/GARANTIA.md) */
export interface Garantia {
  estado: 'pedida' | 'retenida' | 'cobrando' | 'cobrada' | 'liberada' | 'caducada';
  importe: number;          // EUR
  enlaceId: string;
  url: string;
  caducaEn: Timestamp;      // si no se retiene antes, la reserva se libera
  transaccionId?: string;   // lo pone revisarGarantias al completarse
  alertaSala?: boolean;     // Teya no respondió pasado el plazo: sala ya avisada
}

/** festivos/{YYYY-MM-DD} — cierres puntuales */
export interface Festivo {
  motivo: string;
  cerrado: 'todo' | 'comida' | 'cena';
}

/** zonas/{zonaId} */
export interface Zona {
  nombre: string;
  orden: number;
  activa: boolean;
}

/** mesas/{mesaId} */
export interface Mesa {
  zonaId: string;
  nombre: string;         // "T1", "Mesa 12"
  capacidadMin: number;
  capacidadMax: number;
  combinable: boolean;    // puede unirse con otras combinables de la MISMA zona (hasta 3)
  activa: boolean;
}

/** Mesa con su id de documento (necesario para asignar/devolver mesaIds) */
export type MesaConId = Mesa & { id: string };

export type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada' | 'noshow' | 'completada';

/** reservas/{reservaId} */
export interface Reserva {
  fecha: string;            // YYYY-MM-DD
  hora: string;             // HH:mm — hora de entrada
  turno: Turno;
  comensales: number;
  nombre: string;
  telefono: string;         // E.164 sin +
  email: string;            // '' si no lo dio (paso opcional)
  mesaIds: string[];        // 1–3 mesas; [] en pendientes de grupo
  estado: EstadoReserva;
  motivoPendiente?: 'grupo' | 'reincidente' | 'garantia'; // solo si el estado inicial fue pendiente
  garantia?: Garantia;            // solo si se pidió retención al reservar
  origen: 'bot' | 'panel' | 'web';
  idioma: Idioma;
  notas: string;
  recordatorioEnviado: boolean;
  confirmadaCliente: boolean;     // pulsó Confirmar en el recordatorio; true de serie si es del MISMO día
  avisoLiberacionEnviado: boolean;
  pedirResena: boolean;           // lo pone el panel (botón ⭐)
  resenaPedidaEn?: Timestamp;     // sellado por el trigger para no repetir jamás
  // ponytail: fuera de SCHEMA — distingue cancelaciones del bot/sistema de las
  // del panel para que onReservaActualizada no notifique dos veces al cliente.
  canceladaPor?: 'cliente' | 'sistema';
  cancelacionTardia?: boolean;    // el cliente canceló con garantía retenida y < 24 h → se cobra
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/** clientes/{telefono} — histórico mínimo por cliente */
export interface Cliente {
  nombre: string;
  email: string;
  noshows: number;
  actualizadoEn: Timestamp;
}

/** Texto en los 5 idiomas soportados */
export interface TextoIdiomas {
  es: string;
  va: string;
  en: string;
  de: string;
  fr: string;
}

/** Item de una sección de la carta */
export interface ItemCarta {
  nombre: TextoIdiomas;
  descripcion?: TextoIdiomas;
  precio: number;          // EUR; 0 = "s/m" (según mercado)
  porPersona: boolean;     // arroces: precio por persona, mínimo 2
  disponible: boolean;
  alergenos?: string[];
}

/** carta/{seccionId} */
export interface SeccionCarta {
  nombre: TextoIdiomas;
  orden: number;
  visible: boolean;
  items: ItemCarta[];
}

/** Pasos de la máquina de estados del bot */
export type Paso =
  | 'IDLE'
  | 'FECHA'
  | 'TURNO'
  | 'HORA'
  | 'COMENSALES'
  | 'COMENSALES_TEXTO'
  | 'NOMBRE'
  | 'EMAIL'
  | 'NOTAS'
  | 'CONFIRMAR'
  | 'GRUPO_DATOS'
  | 'CANCELAR_ELEGIR'
  | 'ESPERANDO_HUMANO';

/** Borrador de reserva que se va rellenando durante el flujo */
export interface Borrador {
  fecha?: string;
  turno?: Turno;
  hora?: string;
  comensales?: number;
  nombre?: string;
  email?: string;
  notas?: string;
  // ponytail: fuera de SCHEMA — marca que el borrador vino del formulario web
  // ("RESERVA WEB") para que la reserva nazca con origen 'web'.
  web?: boolean;
}

/** conversaciones/{telefono} — estado del flujo del bot */
export interface Conversacion {
  paso: Paso;
  idioma: Idioma;
  baja: boolean;            // BAJA/STOP: jamás mensajes proactivos
  borrador: Borrador;
  actualizadoEn: Timestamp; // si > 30 min, el flujo se reinicia
}
