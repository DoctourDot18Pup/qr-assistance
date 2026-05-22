import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  groups, careers, periods, groupSubjects, subjects,
  users, groupStudents,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { SubjectManager } from "./subject-manager";
import Link from "next/link";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const groupId = Number(id);

  const [group] = await db
    .select({
      id:         groups.id,
      name:       groups.name,
      careerId:   groups.careerId,
      careerName: careers.name,
      periodName: periods.name,
    })
    .from(groups)
    .innerJoin(careers, eq(groups.careerId, careers.id))
    .innerJoin(periods, eq(groups.periodId, periods.id))
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) notFound();

  // Alumnos del mismo período/carrera: estudiantes inscritos en grupos de la misma carrera
  // para limitar la carga de la BD sin necesitar careerId en users
  const siblingGroupIds = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.careerId, group.careerId));

  const siblingIds = siblingGroupIds.map(g => g.id);

  const [
    assignedSubjects,
    enrolledStudents,
    allSubjects,
    allTeachers,
    careerStudentIds,
  ] = await Promise.all([
    db
      .select({
        gsId:        groupSubjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherName: users.name,
      })
      .from(groupSubjects)
      .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
      .innerJoin(users,    eq(groupSubjects.teacherId,  users.id))
      .where(eq(groupSubjects.groupId, groupId))
      .orderBy(subjects.name),

    db
      .select({
        studentId:        users.id,
        name:             users.name,
        enrollmentNumber: users.enrollmentNumber,
      })
      .from(groupStudents)
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(eq(groupStudents.groupId, groupId))
      .orderBy(users.name),

    db
      .select({ id: subjects.id, name: subjects.name, code: subjects.code })
      .from(subjects)
      .orderBy(subjects.name),

    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.role, "teacher"))
      .orderBy(users.name),

    // Alumnos de la carrera: los que ya están en algún grupo de la misma carrera
    siblingIds.length > 0
      ? db
          .selectDistinct({ studentId: groupStudents.studentId })
          .from(groupStudents)
          .where(inArray(groupStudents.groupId, siblingIds))
      : Promise.resolve([]),
  ]);

  // Alumnos disponibles: de la carrera, excluyendo ya inscritos en este grupo
  const enrolledIds = new Set(enrolledStudents.map(s => s.studentId));
  const careerIds   = new Set(careerStudentIds.map(r => r.studentId));

  // Si no hay alumnos en la carrera aún, cargamos todos los alumnos del sistema
  const studentPool = careerIds.size > 0
    ? await db
        .select({ id: users.id, name: users.name, enrollmentNumber: users.enrollmentNumber })
        .from(users)
        .where(and(eq(users.role, "student"), inArray(users.id, [...careerIds])))
        .orderBy(users.name)
    : await db
        .select({ id: users.id, name: users.name, enrollmentNumber: users.enrollmentNumber })
        .from(users)
        .where(eq(users.role, "student"))
        .orderBy(users.name);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={group.name}
        subtitle={`${group.careerName} · ${group.periodName}`}
        actions={
          <Link
            href="/admin/groups"
            className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors flex items-center"
          >
            Volver a grupos
          </Link>
        }
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6 space-y-[18px]">
        {/* Resumen */}
        <div className="grid grid-cols-2 gap-[14px]">
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">Materias</div>
            <div className="text-3xl font-semibold text-[#0A0A0A] tabular leading-none">{assignedSubjects.length}</div>
          </div>
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">Alumnos inscritos</div>
            <div className="text-3xl font-semibold text-[#0A0A0A] tabular leading-none">{enrolledStudents.length}</div>
          </div>
        </div>

        <SubjectManager
          groupId={groupId}
          assigned={assignedSubjects}
          availableSubjects={allSubjects}
          teachers={allTeachers}
          enrolled={enrolledStudents}
          availableStudents={studentPool}
        />
      </div>
    </div>
  );
}
