import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from '../src/lib/db/schema';

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password', 12);

  await db
    .insert(schema.users)
    .values({
      name: 'Administrador',
      email: 'admin@itcelaya.edu.mx',
      password: hashedPassword,
      role: 'admin',
    })
    .onConflictDoNothing();

  await db
    .insert(schema.thresholdSettings)
    .values([
      {
        key: 'attendance_warning',
        value: '75',
        description: '% mínimo antes de alerta amarilla',
      },
      {
        key: 'attendance_risk',
        value: '60',
        description: '% mínimo antes de alerta naranja',
      },
      {
        key: 'attendance_critical',
        value: '50',
        description: '% mínimo antes de alerta roja',
      },
    ])
    .onConflictDoNothing();

  console.log('Seed completed successfully.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
