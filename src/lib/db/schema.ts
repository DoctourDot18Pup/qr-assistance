import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id:               serial('id').primaryKey(),
  name:             text('name').notNull(),
  email:            text('email').notNull().unique(),
  password:         text('password').notNull(),
  role:             text('role').notNull(),
  enrollmentNumber: text('enrollment_number').unique(),
  phone:            text('phone'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
});

export const careers = pgTable('careers', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull(),
  code:      text('code').notNull().unique(),
  active:    boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const periods = pgTable('periods', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate:   date('end_date').notNull(),
  active:    boolean('active').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const subjects = pgTable('subjects', {
  id:            serial('id').primaryKey(),
  name:          text('name').notNull(),
  code:          text('code').notNull().unique(),
  totalSessions: integer('total_sessions').notNull().default(0),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
});

export const groups = pgTable('groups', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull(),
  careerId:  integer('career_id').notNull().references(() => careers.id),
  periodId:  integer('period_id').notNull().references(() => periods.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [uniqueIndex('groups_name_period_idx').on(t.name, t.periodId)]);

export const groupSubjects = pgTable('group_subjects', {
  id:        serial('id').primaryKey(),
  groupId:   integer('group_id').notNull().references(() => groups.id),
  subjectId: integer('subject_id').notNull().references(() => subjects.id),
  teacherId: integer('teacher_id').notNull().references(() => users.id),
}, (t) => [uniqueIndex('gs_group_subject_idx').on(t.groupId, t.subjectId)]);

export const groupStudents = pgTable('group_students', {
  groupId:   integer('group_id').notNull().references(() => groups.id),
  studentId: integer('student_id').notNull().references(() => users.id),
}, (t) => [primaryKey({ columns: [t.groupId, t.studentId] })]);

export const classSessions = pgTable('class_sessions', {
  id:               serial('id').primaryKey(),
  groupSubjectId:   integer('group_subject_id').notNull().references(() => groupSubjects.id),
  date:             timestamp('date').notNull(),
  toleranceMinutes: integer('tolerance_minutes').default(15),
  latitude:         numeric('latitude', { precision: 10, scale: 7 }),
  longitude:        numeric('longitude', { precision: 10, scale: 7 }),
  geoRadius:        integer('geo_radius').default(100),
  geoEnabled:       boolean('geo_enabled').default(false),
  status:           text('status').default('active'),
  closedAt:         timestamp('closed_at'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
});

export const attendances = pgTable('attendances', {
  id:             serial('id').primaryKey(),
  classSessionId: integer('class_session_id').notNull().references(() => classSessions.id),
  studentId:      integer('student_id').notNull().references(() => users.id),
  status:         text('status').notNull().default('absent'),
  method:         text('method'),
  latitude:       numeric('latitude', { precision: 10, scale: 7 }),
  longitude:      numeric('longitude', { precision: 10, scale: 7 }),
  registeredAt:   timestamp('registered_at'),
  createdAt:      timestamp('created_at').defaultNow(),
  updatedAt:      timestamp('updated_at').defaultNow(),
}, (t) => [uniqueIndex('att_session_student_idx').on(t.classSessionId, t.studentId)]);

export const justifications = pgTable('justifications', {
  id:              serial('id').primaryKey(),
  attendanceId:    integer('attendance_id').notNull().references(() => attendances.id),
  description:     text('description'),
  filePath:        text('file_path'),
  status:          text('status').default('pending'),
  rejectionReason: text('rejection_reason'),
  reviewedBy:      integer('reviewed_by').references(() => users.id),
  reviewedAt:      timestamp('reviewed_at'),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
});

export const notificationsLog = pgTable('notifications_log', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id').notNull().references(() => users.id),
  type:      text('type').notNull(),
  message:   text('message').notNull(),
  read:      boolean('read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const thresholdSettings = pgTable('threshold_settings', {
  id:          serial('id').primaryKey(),
  key:         text('key').notNull().unique(),
  value:       text('value').notNull(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});

export type User             = typeof users.$inferSelect;
export type NewUser          = typeof users.$inferInsert;
export type Career           = typeof careers.$inferSelect;
export type NewCareer        = typeof careers.$inferInsert;
export type Period           = typeof periods.$inferSelect;
export type NewPeriod        = typeof periods.$inferInsert;
export type Subject          = typeof subjects.$inferSelect;
export type NewSubject       = typeof subjects.$inferInsert;
export type Group            = typeof groups.$inferSelect;
export type NewGroup         = typeof groups.$inferInsert;
export type GroupSubject     = typeof groupSubjects.$inferSelect;
export type NewGroupSubject  = typeof groupSubjects.$inferInsert;
export type ClassSession     = typeof classSessions.$inferSelect;
export type NewClassSession  = typeof classSessions.$inferInsert;
export type Attendance       = typeof attendances.$inferSelect;
export type NewAttendance    = typeof attendances.$inferInsert;
export type Justification    = typeof justifications.$inferSelect;
export type NewJustification = typeof justifications.$inferInsert;
export type NotificationLog  = typeof notificationsLog.$inferSelect;
export type ThresholdSetting = typeof thresholdSettings.$inferSelect;
