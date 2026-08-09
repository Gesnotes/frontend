export * from './types';
export { ApiError, isApiError, errorMessage } from './ApiError';
export { api, apiFetch, apiFetchBlob, buildUrl } from './http';
export { sessionStore } from './session';
export type { Session } from './session';
export { schoolSelectionStore, useSchoolSelection } from './schoolSelection';
export type { SchoolSelection } from './schoolSelection';
export { staffSessionStore } from './staffSession';
export type { StaffSession } from './staffSession';
export { queryKeys } from './queryKeys';
export { createQueryClient } from './queryClient';
export {
  API_BASE_URL, SCHOOL_SUBDOMAIN, TERM_STORAGE_KEY, MAIN_DOMAIN, isOnSchoolSubdomain,
  DEMO_SUBDOMAIN, DEMO_SCHOOL_NAME, DEMO_IDENTIFIER, DEMO_PASSWORD,
} from './config';

export * as authApi from './resources/auth';
export * as attendanceApi from './resources/attendance';
export * as classesApi from './resources/classes';
export * as schoolYearsApi from './resources/schoolYears';
export * as enrollmentApi from './resources/enrollment';
export * as subjectsApi from './resources/subjects';
export * as teachersApi from './resources/teachers';
export * as studentsApi from './resources/students';
export * as gradesApi from './resources/grades';
export * as evaluationsApi from './resources/evaluations';
export * as dashboardApi from './resources/dashboard';
export * as parentApi from './resources/parent';
export * as referentialsApi from './resources/referentials';
export * as onboardingApi from './resources/onboarding';
export * as staffApi from './resources/staff';
export * as schoolApi from './resources/school';
