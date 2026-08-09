import type { ID } from './types';

/**
 * Clés de cache React Query, centralisées.
 *
 * Chaque famille commence par un préfixe stable pour qu'une invalidation
 * partielle (`['classes']`) atteigne toutes ses variantes.
 */
export const queryKeys = {
  me: ['me'] as const,

  terms: {
    all: ['terms'] as const,
    list: (includeArchived?: boolean) => ['terms', 'list', includeArchived ?? false] as const,
  },

  gradeTypes: {
    all: ['grade-types'] as const,
  },

  classes: {
    all: ['classes'] as const,
    list: (termId?: ID, includeArchived?: boolean) =>
      ['classes', 'list', termId ?? null, includeArchived ?? false] as const,
    detail: (id: ID, termId: ID) => ['classes', 'detail', id, termId] as const,
    bulletin: (id: ID, termId: ID) => ['classes', 'bulletin', id, termId] as const,
  },

  subjects: {
    all: ['subjects'] as const,
    list: (includeArchived?: boolean) => ['subjects', 'list', includeArchived ?? false] as const,
  },

  teachers: {
    all: ['teachers'] as const,
    list: (includeArchived?: boolean) => ['teachers', 'list', includeArchived ?? false] as const,
  },

  students: {
    all: ['students'] as const,
    list: (classId?: ID, page?: number, includeArchived?: boolean) =>
      ['students', 'list', classId ?? null, page ?? 1, includeArchived ?? false] as const,
    detail: (id: ID) => ['students', 'detail', id] as const,
    parentSearch: (query: string) => ['students', 'parent-search', query] as const,
  },

  dashboard: {
    all: ['dashboard'] as const,
    summary: (termId?: ID) => ['dashboard', 'summary', termId ?? null] as const,
    recentGrades: (limit: number) => ['dashboard', 'recent-grades', limit] as const,
  },

  teacherMe: {
    all: ['teacher-me'] as const,
    classes: (termId?: ID) => ['teacher-me', 'classes', termId ?? null] as const,
    evaluations: (classId: ID, subjectId: ID, termId: ID) =>
      ['teacher-me', 'evaluations', classId, subjectId, termId] as const,
    evaluationGrid: (evaluationId: ID) =>
      ['teacher-me', 'evaluation-grid', evaluationId] as const,
    history: (classId?: ID, subjectId?: ID, termId?: ID) =>
      ['teacher-me', 'history', classId ?? null, subjectId ?? null, termId ?? null] as const,
  },

  grades: {
    all: ['grades'] as const,
    detail: (id: ID) => ['grades', 'detail', id] as const,
  },

  parentMe: {
    all: ['parent-me'] as const,
    children: (termId?: ID) => ['parent-me', 'children', termId ?? null] as const,
    devices: ['parent-me', 'devices'] as const,
  },

  children: {
    all: ['children'] as const,
    detail: (id: ID, termId: ID) => ['children', 'detail', id, termId] as const,
    grades: (id: ID, termId?: ID, subjectId?: ID) =>
      ['children', 'grades', id, termId ?? null, subjectId ?? null] as const,
  },

  onboarding: {
    schoolSearch: (query: string) => ['onboarding', 'school-search', query] as const,
  },

  staff: {
    all: ['staff'] as const,
    overview: ['staff', 'overview'] as const,
    schools: ['staff', 'schools'] as const,
    signupRequests: (status?: string) => ['staff', 'signup-requests', status ?? 'all'] as const,
  },
} as const;
