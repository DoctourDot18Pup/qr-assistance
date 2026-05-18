import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendances, users, classSessions, groupSubjects, groupStudents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const { id } = await params;
  const sessionId = Number(id);

  const [cs] = await db
    .select({ id: classSessions.id, status: classSessions.status, groupSubjectId: classSessions.groupSubjectId })
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);

  if (!cs) return NextResponse.json({ success: false, message: "Sesión no encontrada." }, { status: 404 });

  // Asistentes que marcaron presencia
  const present = await db
    .select({
      studentId:        attendances.studentId,
      registeredAt:     attendances.registeredAt,
      name:             users.name,
      enrollmentNumber: users.enrollmentNumber,
    })
    .from(attendances)
    .innerJoin(users, eq(attendances.studentId, users.id))
    .where(and(eq(attendances.classSessionId, sessionId), eq(attendances.status, "present")))
    .orderBy(attendances.registeredAt);

  // Total estudiantes en el grupo
  const [gs] = await db
    .select({ groupId: groupSubjects.groupId })
    .from(groupSubjects)
    .where(eq(groupSubjects.id, cs.groupSubjectId))
    .limit(1);

  let total = 0;
  if (gs) {
    const students = await db
      .select({ studentId: groupStudents.studentId })
      .from(groupStudents)
      .where(eq(groupStudents.groupId, gs.groupId));
    total = students.length;
  }

  return NextResponse.json({
    success: true,
    status: cs.status,
    total,
    present: present.map(p => ({
      id:               p.studentId,
      name:             p.name,
      enrollmentNumber: p.enrollmentNumber,
      registeredAt:     p.registeredAt?.toISOString() ?? null,
    })),
  });
}
