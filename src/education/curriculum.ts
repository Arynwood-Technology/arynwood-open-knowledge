// Adapted from LearnOS features/module-learning.ts; MIT; see NOTICE.
export type ActivityKind =
  | 'learn'
  | 'practice'
  | 'create'
  | 'discuss'
  | 'reflect'
  | 'assess'
export type EvidenceKind =
  | 'written-response'
  | 'photo'
  | 'audio'
  | 'project-link'
  | 'observation'
  | 'quiz'
export interface ModuleActivity {
  id: string
  title: string
  kind: ActivityKind
  learnerAction: string
  evidenceOptions: EvidenceKind[]
  estimatedMinutes: number
}
export interface ModuleLessonPath {
  id: string
  title: string
  objective: string
  estimatedMinutes: number
  prerequisites?: string[]
  activities: ModuleActivity[]
  successCriteria: string[]
}
export interface ModuleUnit {
  id: string
  title: string
  essentialQuestion: string
  outcomes: string[]
  standardIds: string[]
  lessons: ModuleLessonPath[]
}
export interface SemesterCurriculum {
  gradeId: string
  subjectId: string
  semester: 1 | 2
  pacing: { intendedWeeks: number; flexible: true }
  units: ModuleUnit[]
}
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= 5000
const list = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 100 && v.every(str)
const minutes = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1440
export function parseSemesterCurriculum(
  value: unknown,
): SemesterCurriculum | undefined {
  if (
    !obj(value) ||
    !str(value.gradeId) ||
    !str(value.subjectId) ||
    ![1, 2].includes(Number(value.semester)) ||
    typeof value.semester !== 'number' ||
    !obj(value.pacing) ||
    value.pacing.flexible !== true ||
    typeof value.pacing.intendedWeeks !== 'number' ||
    !Number.isInteger(value.pacing.intendedWeeks) ||
    value.pacing.intendedWeeks < 1 ||
    value.pacing.intendedWeeks > 26 ||
    !Array.isArray(value.units) ||
    value.units.length < 1 ||
    value.units.length > 12
  )
    return undefined
  const activities = [
    'learn',
    'practice',
    'create',
    'discuss',
    'reflect',
    'assess',
  ]
  const evidence = [
    'written-response',
    'photo',
    'audio',
    'project-link',
    'observation',
    'quiz',
  ]
  for (const unit of value.units) {
    if (
      !obj(unit) ||
      !str(unit.id) ||
      !str(unit.title) ||
      !str(unit.essentialQuestion) ||
      !list(unit.outcomes) ||
      !list(unit.standardIds) ||
      !Array.isArray(unit.lessons) ||
      !unit.lessons.length ||
      unit.lessons.length > 24
    )
      return undefined
    for (const lesson of unit.lessons) {
      if (
        !obj(lesson) ||
        !str(lesson.id) ||
        !str(lesson.title) ||
        !str(lesson.objective) ||
        !minutes(lesson.estimatedMinutes) ||
        !list(lesson.successCriteria) ||
        (lesson.prerequisites !== undefined && !list(lesson.prerequisites)) ||
        !Array.isArray(lesson.activities) ||
        !lesson.activities.length ||
        lesson.activities.length > 24
      )
        return undefined
      for (const activity of lesson.activities) {
        if (
          !obj(activity) ||
          !str(activity.id) ||
          !str(activity.title) ||
          !str(activity.learnerAction) ||
          !activities.includes(String(activity.kind)) ||
          !minutes(activity.estimatedMinutes) ||
          !list(activity.evidenceOptions) ||
          !activity.evidenceOptions.every((x) => evidence.includes(x))
        )
          return undefined
      }
    }
  }
  return structuredClone(value) as unknown as SemesterCurriculum
}
