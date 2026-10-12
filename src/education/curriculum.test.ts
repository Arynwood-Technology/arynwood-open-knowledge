import { describe, expect, it } from 'vitest'
import { parseSemesterCurriculum } from './curriculum'
import reading from './grade-01-reading.module.json'
describe('preserved LearnOS curriculum', () => {
  it('preserves four units, twelve lessons and multimodal evidence choices', () => {
    const curriculum = parseSemesterCurriculum(reading.curriculum)!
    expect(curriculum.units).toHaveLength(4)
    expect(curriculum.units.flatMap((u) => u.lessons)).toHaveLength(12)
    expect(
      curriculum.units[0].lessons[0].activities[0].evidenceOptions,
    ).toContain('audio')
    expect(curriculum.pacing.flexible).toBe(true)
  })
  it('rejects unsafe or malformed nested activities and invalid pacing', () => {
    const value = structuredClone(reading.curriculum)
    value.units[0].lessons[0].activities[0].learnerAction = ''
    expect(parseSemesterCurriculum(value)).toBeUndefined()
    expect(
      parseSemesterCurriculum({
        ...reading.curriculum,
        pacing: { intendedWeeks: -1, flexible: true },
      }),
    ).toBeUndefined()
    expect(parseSemesterCurriculum({})).toBeUndefined()
  })
})
