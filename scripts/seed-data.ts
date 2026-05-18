/**
 * Seed de datos de prueba para desarrollo.
 * Basado en el plan de estudios ISC del TecNM Celaya.
 * Ejecutar: npx dotenv-cli -e .env.local -- npx tsx scripts/seed-data.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import * as schema from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// ── Helpers ─────────────────────────────────────────────────────────────────

async function findOrInsertCareer(data: typeof schema.careers.$inferInsert) {
  const [existing] = await db.select().from(schema.careers).where(eq(schema.careers.code, data.code!));
  if (existing) return existing;
  const [row] = await db.insert(schema.careers).values(data).returning();
  return row;
}

async function findOrInsertPeriod(data: typeof schema.periods.$inferInsert) {
  const [existing] = await db.select().from(schema.periods).where(eq(schema.periods.name, data.name));
  if (existing) return existing;
  const [row] = await db.insert(schema.periods).values(data).returning();
  return row;
}

async function findOrInsertSubject(data: typeof schema.subjects.$inferInsert) {
  const [existing] = await db.select().from(schema.subjects).where(eq(schema.subjects.code, data.code!));
  if (existing) return existing;
  const [row] = await db.insert(schema.subjects).values(data).returning();
  return row;
}

async function findOrInsertUser(data: typeof schema.users.$inferInsert) {
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, data.email));
  if (existing) return existing;
  const [row] = await db.insert(schema.users).values(data).returning();
  return row;
}

async function findOrInsertGroup(data: typeof schema.groups.$inferInsert) {
  const [existing] = await db.select().from(schema.groups)
    .where(eq(schema.groups.name, data.name));
  if (existing) return existing;
  const [row] = await db.insert(schema.groups).values(data).returning();
  return row;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function seedData() {
  console.log('Iniciando seed de datos de prueba...');
  const pw = await bcrypt.hash('password', 10);

  // ── 1. Carreras ──────────────────────────────────────────────────────────

  console.log('  Insertando carreras...');
  const isc = await findOrInsertCareer({ name: 'Ingeniería en Sistemas Computacionales', code: 'ISC', active: true });
  const iia = await findOrInsertCareer({ name: 'Ingeniería Industrial y de Administración', code: 'IIA', active: true });
  const ige = await findOrInsertCareer({ name: 'Ingeniería en Gestión Empresarial',        code: 'IGE', active: true });
  const iec = await findOrInsertCareer({ name: 'Ingeniería Electrónica',                   code: 'IEC', active: true });

  // ── 2. Períodos ──────────────────────────────────────────────────────────

  console.log('  Insertando períodos...');
  const p2025_1 = await findOrInsertPeriod({ name: '2025-1', startDate: '2025-01-13', endDate: '2025-06-20', active: false });
  const p2025_2 = await findOrInsertPeriod({ name: '2025-2', startDate: '2025-08-18', endDate: '2025-12-19', active: false });
  const p2026_1 = await findOrInsertPeriod({ name: '2026-1', startDate: '2026-01-12', endDate: '2026-06-19', active: true  });

  // ── 3. Materias (plan ISC) ────────────────────────────────────────────────

  console.log('  Insertando materias...');

  // Semestre 1
  const mFundInv  = await findOrInsertSubject({ code: 'ACC-0906', name: 'Fundamentos de Investigación',       totalSessions: 16 });
  const mFundProg = await findOrInsertSubject({ code: 'AED-1285', name: 'Fundamentos de Programación',        totalSessions: 16 });
  const mMatDisc  = await findOrInsertSubject({ code: 'AEF-1041', name: 'Matemáticas Discretas',              totalSessions: 16 });
  const mEtica    = await findOrInsertSubject({ code: 'ACH-2307', name: 'Taller de Ética',                    totalSessions: 16 });

  // Semestre 2
  const mCalcDif  = await findOrInsertSubject({ code: 'ACF-2301', name: 'Cálculo Diferencial',                totalSessions: 16 });
  const mDesaSust = await findOrInsertSubject({ code: 'ACD-0908', name: 'Desarrollo Sustentable',             totalSessions: 16 });
  const mPOO      = await findOrInsertSubject({ code: 'AED-1286', name: 'Programación Orientada a Objetos',   totalSessions: 16 });
  const mTallAdm  = await findOrInsertSubject({ code: 'SCH-1024', name: 'Taller de Administración',           totalSessions: 16 });

  // Semestre 3
  const mEstrDat  = await findOrInsertSubject({ code: 'AED-1026', name: 'Estructura de Datos',                totalSessions: 16 });
  const mCultEmp  = await findOrInsertSubject({ code: 'SCC-1005', name: 'Cultura Empresarial',                totalSessions: 16 });

  // Semestre 4
  const mFundBD   = await findOrInsertSubject({ code: 'AEF-1031', name: 'Fundamentos de Base de Datos',       totalSessions: 16 });
  const mProbEst  = await findOrInsertSubject({ code: 'AEF-1052', name: 'Probabilidad y Estadística',         totalSessions: 16 });

  // Semestre 5
  const mSistOp   = await findOrInsertSubject({ code: 'AEC-1061', name: 'Sistemas Operativos',                totalSessions: 16 });
  const mInvOp    = await findOrInsertSubject({ code: 'SCC-1013', name: 'Investigación de Operaciones',       totalSessions: 16 });
  const mPrincElec= await findOrInsertSubject({ code: 'SCD-1018', name: 'Principios Eléctricos y Aplic. Digitales', totalSessions: 16 });

  // Semestre 6
  const mFundIS   = await findOrInsertSubject({ code: 'SCC-1007', name: 'Fundamentos de Ingeniería de Software', totalSessions: 16 });
  const mFundTel  = await findOrInsertSubject({ code: 'AEC-1034', name: 'Fundamentos de Telecomunicaciones',  totalSessions: 16 });
  const mSimul    = await findOrInsertSubject({ code: 'SCD-1022', name: 'Simulación',                         totalSessions: 16 });

  // Semestre 7
  const mArqComp  = await findOrInsertSubject({ code: 'SCD-1003', name: 'Arquitectura de Computadoras',       totalSessions: 16 });
  const mEcuDif   = await findOrInsertSubject({ code: 'ACF-0905', name: 'Ecuaciones Diferenciales',           totalSessions: 16 });
  const mGrafic   = await findOrInsertSubject({ code: 'SCC-1010', name: 'Graficación',                        totalSessions: 16 });
  const mIA       = await findOrInsertSubject({ code: 'SCC-1012', name: 'Inteligencia Artificial',            totalSessions: 16 });
  const mMetNum   = await findOrInsertSubject({ code: 'SCC-1017', name: 'Métodos Numéricos',                  totalSessions: 16 });
  const mTallBD   = await findOrInsertSubject({ code: 'SCA-1025', name: 'Taller de Base de Datos',            totalSessions: 16 });
  const mTallSO   = await findOrInsertSubject({ code: 'SCA-1026', name: 'Taller de Sistemas Operativos',      totalSessions: 16 });

  // Semestre 8
  const mAdmBD    = await findOrInsertSubject({ code: 'SCB-1001', name: 'Administración de Base de Datos',    totalSessions: 16 });
  const mLenInt   = await findOrInsertSubject({ code: 'SCC-1014', name: 'Lenguajes de Interfaz',              totalSessions: 16 });
  const mLenAut1  = await findOrInsertSubject({ code: 'SCD-1015', name: 'Lenguajes y Autómatas I',            totalSessions: 16 });
  const mProgLog  = await findOrInsertSubject({ code: 'SCC-1019', name: 'Programación Lógica y Funcional',    totalSessions: 16 });
  const mProgWeb  = await findOrInsertSubject({ code: 'AEB-1055', name: 'Programación Web',                   totalSessions: 16 });
  const mRedes    = await findOrInsertSubject({ code: 'SCD-1021', name: 'Redes de Computadoras',              totalSessions: 16 });

  // Semestre 9
  const mBigData  = await findOrInsertSubject({ code: 'IDD-2501', name: 'Big Data',                           totalSessions: 16 });
  const mConmRed  = await findOrInsertSubject({ code: 'SCD-1004', name: 'Conmutación y Enrutamiento en Redes', totalSessions: 16 });
  const mIngSoft  = await findOrInsertSubject({ code: 'SCD-1011', name: 'Ingeniería de Software',             totalSessions: 16 });
  const mIntDat   = await findOrInsertSubject({ code: 'IDF-2505', name: 'Inteligencia de Datos',              totalSessions: 16 });
  const mSistProg = await findOrInsertSubject({ code: 'SCD-1023', name: 'Sistemas Programables',              totalSessions: 16 });
  const mTallInv  = await findOrInsertSubject({ code: 'ACA-0909', name: 'Taller de Investigación I',          totalSessions: 16 });

  // ── 4. Docentes ──────────────────────────────────────────────────────────

  console.log('  Insertando docentes...');
  const tGrimaldo  = await findOrInsertUser({ name: 'Oscar Grimaldo Aguayo',      email: 'grimaldo.osag@itcelaya.edu.mx',   password: pw, role: 'teacher' });
  const tGonzalez  = await findOrInsertUser({ name: 'María González López',        email: 'gonzalez.malog@itcelaya.edu.mx',  password: pw, role: 'teacher' });
  const tHernandez = await findOrInsertUser({ name: 'Roberto Hernández Martínez',  email: 'hernandez.robm@itcelaya.edu.mx',  password: pw, role: 'teacher' });
  const tPerez     = await findOrInsertUser({ name: 'Ana Pérez Torres',            email: 'perez.anat@itcelaya.edu.mx',      password: pw, role: 'teacher' });
  const tRamirez   = await findOrInsertUser({ name: 'Carlos Ramírez Vega',         email: 'ramirez.carv@itcelaya.edu.mx',    password: pw, role: 'teacher' });
  const tSanchez   = await findOrInsertUser({ name: 'Laura Sánchez Morales',       email: 'sanchez.laum@itcelaya.edu.mx',    password: pw, role: 'teacher' });
  const tFlores    = await findOrInsertUser({ name: 'Juan Flores Reyes',           email: 'flores.juanr@itcelaya.edu.mx',   password: pw, role: 'teacher' });
  const tMendoza   = await findOrInsertUser({ name: 'Patricia Mendoza Cruz',       email: 'mendoza.patc@itcelaya.edu.mx',   password: pw, role: 'teacher' });
  const tCastro    = await findOrInsertUser({ name: 'Miguel Castro Delgado',       email: 'castro.migdel@itcelaya.edu.mx',  password: pw, role: 'teacher' });
  const tRojas     = await findOrInsertUser({ name: 'Silvia Rojas Blanco',         email: 'rojas.silb@itcelaya.edu.mx',     password: pw, role: 'teacher' });
  const tNunez     = await findOrInsertUser({ name: 'Ramón Núñez García',          email: 'nunez.ramg@itcelaya.edu.mx',     password: pw, role: 'teacher' });
  const tDelgado   = await findOrInsertUser({ name: 'Fernando Delgado Vásquez',    email: 'delgado.ferv@itcelaya.edu.mx',   password: pw, role: 'teacher' });

  // ── 5. Estudiantes ───────────────────────────────────────────────────────

  console.log('  Insertando estudiantes...');

  // Semestre 10 (generación ~2021)
  const s21031430 = await findOrInsertUser({ name: 'Luis Roberto Gomez Ramirez',   email: '21031430@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '21031430' });
  const s21031431 = await findOrInsertUser({ name: 'Ana Isabel Vargas Moreno',      email: '21031431@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '21031431' });
  const s21031432 = await findOrInsertUser({ name: 'Carlos Alberto Jiménez Silva',  email: '21031432@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '21031432' });
  const s21031433 = await findOrInsertUser({ name: 'Mariana Fernández Ruiz',        email: '21031433@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '21031433' });
  const s21031434 = await findOrInsertUser({ name: 'Jorge Alejandro Torres Medina', email: '21031434@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '21031434' });
  const s21031435 = await findOrInsertUser({ name: 'Valeria Espinoza Leal',         email: '21031435@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '21031435' });

  // Semestre 9 (generación ~2022)
  const s22030001 = await findOrInsertUser({ name: 'Andrea Sofía López Reyes',      email: '22030001@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '22030001' });
  const s22030002 = await findOrInsertUser({ name: 'Héctor Manuel Díaz Fuentes',    email: '22030002@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '22030002' });
  const s22030003 = await findOrInsertUser({ name: 'Daniela Martínez Soria',        email: '22030003@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '22030003' });
  const s22030004 = await findOrInsertUser({ name: 'Ricardo Olvera Campos',         email: '22030004@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '22030004' });
  const s22030005 = await findOrInsertUser({ name: 'Jimena Salinas Quiróz',         email: '22030005@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '22030005' });

  // Semestre 7 (generación ~2023)
  const s23010001 = await findOrInsertUser({ name: 'Valentina Cruz Espinoza',       email: '23010001@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '23010001' });
  const s23010002 = await findOrInsertUser({ name: 'Luis Miguel Garza Sandoval',    email: '23010002@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '23010002' });
  const s23010003 = await findOrInsertUser({ name: 'Sofía Ramos Guerrero',          email: '23010003@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '23010003' });
  const s23010004 = await findOrInsertUser({ name: 'Emilio Varela Castillo',        email: '23010004@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '23010004' });
  const s23010005 = await findOrInsertUser({ name: 'Fernanda Guzmán Aguilar',       email: '23010005@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '23010005' });
  const s23010006 = await findOrInsertUser({ name: 'Pablo Ortega Núñez',            email: '23010006@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '23010006' });
  const s23010007 = await findOrInsertUser({ name: 'Camila Herrera Bravo',          email: '23010007@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '23010007' });
  const s23010008 = await findOrInsertUser({ name: 'Rodrigo Navarro Blanco',        email: '23010008@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '23010008' });

  // Semestre 5 (generación ~2024)
  const s24010001 = await findOrInsertUser({ name: 'Sebastián Morales Fuentes',     email: '24010001@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '24010001' });
  const s24010002 = await findOrInsertUser({ name: 'Isabella Torres Cruz',          email: '24010002@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '24010002' });
  const s24010003 = await findOrInsertUser({ name: 'Maximiliano Reyes Vega',        email: '24010003@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '24010003' });
  const s24010004 = await findOrInsertUser({ name: 'Lucía Alvarado Soto',           email: '24010004@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '24010004' });
  const s24010005 = await findOrInsertUser({ name: 'Diego Ramírez Zamora',          email: '24010005@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '24010005' });

  // Semestre 3 (generación ~2025)
  const s25010001 = await findOrInsertUser({ name: 'Santiago Peña Castañeda',       email: '25010001@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '25010001' });
  const s25010002 = await findOrInsertUser({ name: 'Valeria Ríos Paredes',          email: '25010002@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '25010002' });
  const s25010003 = await findOrInsertUser({ name: 'Mateo García Serrano',          email: '25010003@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '25010003' });
  const s25010004 = await findOrInsertUser({ name: 'Regina Delgado Mora',           email: '25010004@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '25010004' });
  const s25010005 = await findOrInsertUser({ name: 'Alejandro Méndez Flores',       email: '25010005@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '25010005' });
  const s25010006 = await findOrInsertUser({ name: 'Natalia Cortés Vega',           email: '25010006@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '25010006' });

  // Semestre 1 (generación ~2026)
  const s26010001 = await findOrInsertUser({ name: 'Emiliano Vázquez Reyna',        email: '26010001@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '26010001' });
  const s26010002 = await findOrInsertUser({ name: 'Paola Muñoz Espino',            email: '26010002@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '26010002' });
  const s26010003 = await findOrInsertUser({ name: 'Iker Romero Acosta',            email: '26010003@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '26010003' });
  const s26010004 = await findOrInsertUser({ name: 'Sofía Aguirre Palacios',        email: '26010004@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '26010004' });
  const s26010005 = await findOrInsertUser({ name: 'Andrés Castillo Luna',          email: '26010005@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '26010005' });
  const s26010006 = await findOrInsertUser({ name: 'Fernanda Ibáñez Robles',        email: '26010006@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '26010006' });

  // IIA / IGE estudiantes
  const s24020001 = await findOrInsertUser({ name: 'Fernando Salinas Quiroz',       email: '24020001@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '24020001' });
  const s24020002 = await findOrInsertUser({ name: 'Adriana Campos Leal',           email: '24020002@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '24020002' });
  const s24020003 = await findOrInsertUser({ name: 'Marco Soria Durán',             email: '24020003@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '24020003' });
  const s25020001 = await findOrInsertUser({ name: 'Gabriela Acosta Pimentel',      email: '25020001@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '25020001' });
  const s25020002 = await findOrInsertUser({ name: 'Ernesto Villanueva Ríos',       email: '25020002@itcelaya.edu.mx', password: pw, role: 'student', enrollmentNumber: '25020002' });

  // ── 6. Grupos (período 2026-1) ────────────────────────────────────────────

  console.log('  Insertando grupos...');
  const gISC10A = await findOrInsertGroup({ name: 'ISC-10A', careerId: isc.id, periodId: p2026_1.id });
  const gISC9A  = await findOrInsertGroup({ name: 'ISC-9A',  careerId: isc.id, periodId: p2026_1.id });
  const gISC7A  = await findOrInsertGroup({ name: 'ISC-7A',  careerId: isc.id, periodId: p2026_1.id });
  const gISC7B  = await findOrInsertGroup({ name: 'ISC-7B',  careerId: isc.id, periodId: p2026_1.id });
  const gISC5A  = await findOrInsertGroup({ name: 'ISC-5A',  careerId: isc.id, periodId: p2026_1.id });
  const gISC5B  = await findOrInsertGroup({ name: 'ISC-5B',  careerId: isc.id, periodId: p2026_1.id });
  const gISC3A  = await findOrInsertGroup({ name: 'ISC-3A',  careerId: isc.id, periodId: p2026_1.id });
  const gISC3B  = await findOrInsertGroup({ name: 'ISC-3B',  careerId: isc.id, periodId: p2026_1.id });
  const gISC1A  = await findOrInsertGroup({ name: 'ISC-1A',  careerId: isc.id, periodId: p2026_1.id });
  const gISC1B  = await findOrInsertGroup({ name: 'ISC-1B',  careerId: isc.id, periodId: p2026_1.id });
  const gIIA5A  = await findOrInsertGroup({ name: 'IIA-5A',  careerId: iia.id, periodId: p2026_1.id });
  const gIGE3A  = await findOrInsertGroup({ name: 'IGE-3A',  careerId: ige.id, periodId: p2026_1.id });

  // ── 7. Group-Subjects (qué materia imparte cada docente en cada grupo) ───

  console.log('  Asignando materias a grupos...');

  async function gs(groupId: number, subjectId: number, teacherId: number) {
    await db.insert(schema.groupSubjects)
      .values({ groupId, subjectId, teacherId })
      .onConflictDoNothing();
  }

  // ISC-10A — semestre 10 (materias de 9° que siguen cursando + taller investigación)
  await gs(gISC10A.id, mBigData.id,  tGrimaldo.id);
  await gs(gISC10A.id, mIngSoft.id,  tHernandez.id);
  await gs(gISC10A.id, mIntDat.id,   tNunez.id);
  await gs(gISC10A.id, mTallInv.id,  tGonzalez.id);

  // ISC-9A — semestre 9
  await gs(gISC9A.id, mBigData.id,   tGonzalez.id);
  await gs(gISC9A.id, mIngSoft.id,   tPerez.id);
  await gs(gISC9A.id, mConmRed.id,   tCastro.id);
  await gs(gISC9A.id, mIntDat.id,    tRamirez.id);
  await gs(gISC9A.id, mSistProg.id,  tDelgado.id);
  await gs(gISC9A.id, mTallInv.id,   tGrimaldo.id);

  // ISC-7A — semestre 7
  await gs(gISC7A.id, mIA.id,       tRamirez.id);
  await gs(gISC7A.id, mGrafic.id,   tSanchez.id);
  await gs(gISC7A.id, mArqComp.id,  tFlores.id);
  await gs(gISC7A.id, mMetNum.id,   tMendoza.id);
  await gs(gISC7A.id, mEcuDif.id,   tPerez.id);
  await gs(gISC7A.id, mTallBD.id,   tHernandez.id);
  await gs(gISC7A.id, mTallSO.id,   tCastro.id);

  // ISC-7B — semestre 7
  await gs(gISC7B.id, mIA.id,       tRamirez.id);
  await gs(gISC7B.id, mGrafic.id,   tMendoza.id);
  await gs(gISC7B.id, mArqComp.id,  tNunez.id);
  await gs(gISC7B.id, mMetNum.id,   tDelgado.id);
  await gs(gISC7B.id, mEcuDif.id,   tRojas.id);
  await gs(gISC7B.id, mTallBD.id,   tGonzalez.id);
  await gs(gISC7B.id, mTallSO.id,   tFlores.id);

  // ISC-5A — semestre 5
  await gs(gISC5A.id, mSistOp.id,   tCastro.id);
  await gs(gISC5A.id, mInvOp.id,    tRojas.id);
  await gs(gISC5A.id, mPrincElec.id, tDelgado.id);
  await gs(gISC5A.id, mFundIS.id,   tSanchez.id);

  // ISC-5B — semestre 5
  await gs(gISC5B.id, mSistOp.id,   tFlores.id);
  await gs(gISC5B.id, mInvOp.id,    tNunez.id);
  await gs(gISC5B.id, mPrincElec.id, tRamirez.id);
  await gs(gISC5B.id, mFundIS.id,   tRojas.id);

  // ISC-3A — semestre 3
  await gs(gISC3A.id, mEstrDat.id,  tGrimaldo.id);
  await gs(gISC3A.id, mPOO.id,      tGonzalez.id);
  await gs(gISC3A.id, mCalcDif.id,  tPerez.id);
  await gs(gISC3A.id, mCultEmp.id,  tMendoza.id);

  // ISC-3B — semestre 3
  await gs(gISC3B.id, mEstrDat.id,  tHernandez.id);
  await gs(gISC3B.id, mPOO.id,      tGrimaldo.id);
  await gs(gISC3B.id, mCalcDif.id,  tRojas.id);
  await gs(gISC3B.id, mCultEmp.id,  tSanchez.id);

  // ISC-1A — semestre 1
  await gs(gISC1A.id, mFundProg.id, tHernandez.id);
  await gs(gISC1A.id, mMatDisc.id,  tPerez.id);
  await gs(gISC1A.id, mFundInv.id,  tMendoza.id);
  await gs(gISC1A.id, mEtica.id,    tGonzalez.id);

  // ISC-1B — semestre 1
  await gs(gISC1B.id, mFundProg.id, tFlores.id);
  await gs(gISC1B.id, mMatDisc.id,  tRamirez.id);
  await gs(gISC1B.id, mFundInv.id,  tSanchez.id);
  await gs(gISC1B.id, mEtica.id,    tCastro.id);

  // IIA-5A
  await gs(gIIA5A.id, mInvOp.id,   tSanchez.id);
  await gs(gIIA5A.id, mSimul.id,   tRamirez.id);

  // IGE-3A
  await gs(gIGE3A.id, mTallAdm.id, tMendoza.id);
  await gs(gIGE3A.id, mDesaSust.id, tGonzalez.id);

  // ── 8. Group-Students ────────────────────────────────────────────────────

  console.log('  Asignando estudiantes a grupos...');

  async function addStudent(groupId: number, studentId: number) {
    await db.insert(schema.groupStudents)
      .values({ groupId, studentId })
      .onConflictDoNothing();
  }

  // ISC-10A
  for (const s of [s21031430, s21031431, s21031432, s21031433, s21031434, s21031435]) {
    await addStudent(gISC10A.id, s.id);
  }

  // ISC-9A
  for (const s of [s22030001, s22030002, s22030003, s22030004, s22030005]) {
    await addStudent(gISC9A.id, s.id);
  }

  // ISC-7A
  for (const s of [s23010001, s23010002, s23010003, s23010004]) {
    await addStudent(gISC7A.id, s.id);
  }

  // ISC-7B
  for (const s of [s23010005, s23010006, s23010007, s23010008]) {
    await addStudent(gISC7B.id, s.id);
  }

  // ISC-5A
  for (const s of [s24010001, s24010002, s24010003]) {
    await addStudent(gISC5A.id, s.id);
  }

  // ISC-5B
  for (const s of [s24010004, s24010005]) {
    await addStudent(gISC5B.id, s.id);
  }

  // ISC-3A
  for (const s of [s25010001, s25010002, s25010003]) {
    await addStudent(gISC3A.id, s.id);
  }

  // ISC-3B
  for (const s of [s25010004, s25010005, s25010006]) {
    await addStudent(gISC3B.id, s.id);
  }

  // ISC-1A
  for (const s of [s26010001, s26010002, s26010003]) {
    await addStudent(gISC1A.id, s.id);
  }

  // ISC-1B
  for (const s of [s26010004, s26010005, s26010006]) {
    await addStudent(gISC1B.id, s.id);
  }

  // IIA-5A
  for (const s of [s24020001, s24020002, s24020003]) {
    await addStudent(gIIA5A.id, s.id);
  }

  // IGE-3A
  for (const s of [s25020001, s25020002]) {
    await addStudent(gIGE3A.id, s.id);
  }

  console.log('Seed de datos completado.');
  console.log('');
  console.log('Usuarios creados (contraseña: password):');
  console.log('  Docentes:    grimaldo.osag@itcelaya.edu.mx  gonzalez.malog@itcelaya.edu.mx  ...');
  console.log('  Estudiantes: 21031430@itcelaya.edu.mx  22030001@itcelaya.edu.mx  ...');
  process.exit(0);
}

seedData().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
