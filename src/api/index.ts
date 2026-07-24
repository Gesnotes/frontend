export * from './types';
export { ApiError, isApiError, errorMessage } from './ApiError';
export { api, apiFetch, apiFetchBlob, buildUrl } from './http';
export { sessionStore } from './session';
export type { Session } from './session';
export { queryKeys } from './queryKeys';
export { createQueryClient } from './queryClient';
export { API_BASE_URL, SCHOOL_SUBDOMAIN } from './config';

export * as authApi from './resources/auth';
export * as classesApi from './resources/classes';
export * as subjectsApi from './resources/subjects';
export * as teachersApi from './resources/teachers';
export * as studentsApi from './resources/students';
export * as gradesApi from './resources/grades';
export * as evaluationsApi from './resources/evaluations';
export * as dashboardApi from './resources/dashboard';
export * as parentApi from './resources/parent';
export * as referentialsApi from './resources/referentials';
