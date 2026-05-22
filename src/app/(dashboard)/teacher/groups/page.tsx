import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  groupSubjects, groups, subjects, periods,
  groupStudents, users, attendances, classSessions,
} from "@/lib/db/schema";
import { eq, and, count, inArray } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import Link from "next/link";
import { StudentSearchTable } from "./student-search-table";

async function getTeacherGroups(teacherId: number) {
  return db
    .select({
      gsId:        groupSubjects.id,
      groupId:     groups.id,
      groupName:   groups.name,
      subjectName: subjects.name,
      periodName:  periods.name,
    })
    .from(groupSubjects)
    .innerJoin(groups,   eq(groupSubjects.groupId,   groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(periods,  eq(groups.periodId,         periods.id))
    .where(and(eq(groupSubjects.teacherId, teacherId), eq(periods.active, true)));
}

async function getGroupStudentCounts(gsIds: number[]): Promise<Record<number, number>> {
  if (gsIds.length === 0) return {};
  const rows = await db
    .select({ gsId: groupStudents.groupSubjectId, n: count() })
    .from(groupStudents)
    .where(inArray(groupStudents.groupSubjectId, gsIds))
    .groupBy(groupStudents.groupSubjectId);
  const map: Record<number, number> = {};
  for (const r of rows) map[r.gsId] = Number(r.n);
  return map;
}

async function getSessionCounts(gsIds: number[]): Promise<Record<number, number>> {
  if (gsIds.length === 0) return {};
  const rows = await db
    .select({ gsId: classSessions.groupSubjectId, n: count() })
    .from(classSessions)
    .where(and(
      inArray(classSessions.groupSubjectId, gsIds),
      eq(classSessions.status, "closed"),
    ))
    .groupBy(classSessions.groupSubjectId);
  const map: Record<number, number> = {};
  for (const r of rows) map[r.gsId] = Number(r.n);
  return map;
}

async function getGroupsAttendanceAvg(gsIds: number[]): Promise<Record<number, number | null>> {
  if (gsIds.length === 0) return {};

  const sessionRows = await db
    .select({ gsId: classSessions.groupSubjectId, n: count() })
    .from(classSessions)
    .where(inArray(classSessions.groupSubjectId, gsIds))
    .groupBy(classSessions.groupSubjectId);

  const sessionMap: Record<number, number> = {};
  for (const r of sessionRows) sessionMap[r.gsId] = Number(r.n);

  const attendRows = await db
    .select({
      gsId:   classSessions.groupSubjectId,
      status: attendances.status,
      n:      count(),
    })
    .from(attendances)
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .where(inArray(classSessions.groupSubjectId, gsIds))
    .groupBy(classSessions.groupSubjectId, attendances.status);

  const presentMap: Record<number, number> = {};
  const totalAttMap: Record<number, number> = {};
  for (const r of attendRows) {
    totalAttMap[r.gsId] = (totalAttMap[r.gsId] ?? 0) + Number(r.n);
    if (r.status === "present" || r.status === "justified") {
      presentMap[r.gsId] = (presentMap[r.gsId] ?? 0) + Number(r.n);
    }
  }

  const result: Record<number, number | null> = {};
  for (const gsId of gsIds) {
    const total = totalAttMap[gsId] ?? 0;
    if (total === 0) { result[gsId] = null; continue; }
    result[gsId] = Math.round(((presentMap[gsId] ?? 0) / total) * 100);
  }
  return result;
}

async function getGroupStudents(gsId: number) {
  return db
    .select({
      id:               users.id,
      name:             users.name,
      enrollmentNumber: users.enrollmentNumber,
    })
    .from(groupStudents)
    .innerJoin(users, eq(groupStudents.studentId, users.id))
    .where(eq(groupStudents.groupSubjectId, gsId))
    .orderBy(users.name);
}

async function getAttendanceStats(groupSubjectId: number, studentIds: number[]) {
  if (studentIds.length === 0) return {};

  const [totalSessions] = await db
    .select({ n: count() })
    .from(classSessions)
    .where(eq(classSessions.groupSubjectId, groupSubjectId));

  const total = Number(totalSessions.n);
  if (total === 0) return {};

  const stats = await db
    .select({
      studentId: attendances.studentId,
      status:    attendances.status,
      n:         count(),
    })
    .from(attendances)
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .where(eq(classSessions.groupSubjectId, groupSubjectId))
    .groupBy(attendances.studentId, attendances.status);

  const result: Record<number, { present: number; absent: number; justified: number; total: number }> = {};
  for (const sid of studentIds) result[sid] = { present: 0, absent: 0, justified: 0, total };
  for (const s of stats) {
    if (!result[s.studentId]) continue;
    if (s.status === "present")   result[s.studentId].present   = Number(s.n);
    if (s.status === "absent")    result[s.studentId].absent    = Number(s.n);
    if (s.status === "justified") result[s.studentId].justified = Number(s.n);
  }
  return result;
}

export default async function TeacherGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ gsId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacherId = Number(session.user.id);

  const params = await searchParams;
  const myGroups = await getTeacherGroups(teacherId);

  const gsIds = myGroups.map(g => g.gsId);

  const [studentCounts, attendanceAvgs, sessionCounts] = await Promise.all([
    getGroupStudentCounts(gsIds),
    getGroupsAttendanceAvg(gsIds),
    getSessionCounts(gsIds),
  ]);

  const selectedGs = myGroups.find(g => String(g.gsId) === params.gsId) ?? myGroups[0];

  let students: Awaited<ReturnType<typeof getGroupStudents>> = [];
  let attendanceStats: Record<number, { present: number; absent: number; justified: number; total: number }> = {};

  if (selectedGs) {
    students = await getGroupStudents(selectedGs.gsId);
    attendanceStats = await getAttendanceStats(selectedGs.gsId, students.map(s => s.id));
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Mis grupos"
        subtitle={`${myGroups.length} grupo${myGroups.length !== 1 ? "s" : ""} asignado${myGroups.length !== 1 ? "s" : ""} en el período activo`}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6 space-y-[18px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          {myGroups.map((g) => {
            const stuCount  = studentCounts[g.gsId] ?? 0;
            const sessCount = sessionCounts[g.gsId] ?? 0;
            const avg       = attendanceAvgs[g.gsId];
            const avgColor  = avg === null ? "text-[#6B6457]"
              : avg >= 85 ? "text-[#2F6A4B]"
              : avg >= 70 ? "text-[#92620E]"
              : "text-[#7A1A1A]";

            return (
              <div key={g.gsId} className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px]">
                <div className="mb-3">
                  <span className="inline-flex items-center h-5 px-2 text-[10.5px] font-semibold rounded bg-[#0A0A0A] text-white tracking-wide">
                    {g.groupName}
                  </span>
                  <div className="text-[15px] font-semibold mt-2 text-[#0A0A0A]">{g.subjectName}</div>
                  <div className="text-xs text-[#6B6457] mt-0.5">Período {g.periodName}</div>
                </div>

                <div className="flex items-end gap-5 pt-3 border-t border-[#D8CFB8]">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6457]">Estudiantes</div>
                    <div className="text-[22px] font-bold text-[#0A0A0A] tabular mt-0.5 leading-none">
                      {stuCount > 0 ? stuCount : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6457]">Sesiones impartidas</div>
                    <div className="text-[22px] font-bold text-[#0A0A0A] tabular mt-0.5 leading-none">{sessCount}</div>
                  </div>
                  <div className="ml-auto flex flex-col items-end">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6457]">Asistencia</div>
                    <div className={`text-[22px] font-bold tabular mt-0.5 leading-none ${avgColor}`}>
                      {avg !== null ? `${avg}%` : "—"}
                    </div>
                  </div>
                  <Link
                    href={`/teacher/groups?gsId=${g.gsId}`}
                    className="h-8 px-3 text-xs font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors inline-flex items-center shrink-0"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {selectedGs && (
          <StudentSearchTable
            title={`${selectedGs.groupName} · ${selectedGs.subjectName} — Estudiantes`}
            students={students}
            attendanceStats={attendanceStats}
          />
        )}
      </div>
    </div>
  );
}
