import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../http';
import { queryKeys } from '../queryKeys';
import type {
  CreateNotificationPayload,
  NotificationListResponse,
  SentNotificationItem,
} from '../types';

/** `GET /notifications` — liste des notifications pour le parent connecté. */
export function fetchNotifications(unreadOnly = false): Promise<NotificationListResponse> {
  return api.get<NotificationListResponse>('/notifications', { unread: unreadOnly });
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: queryKeys.notifications.list(unreadOnly),
    queryFn: () => fetchNotifications(unreadOnly),
    refetchInterval: 15000, // Rafraîchissement automatique toutes les 15s
  });
}

/** `GET /notifications/sent` — historique des annonces/incidents envoyés par l'école ou prof. */
export function fetchSentNotifications(): Promise<{ items: SentNotificationItem[] }> {
  return api.get<{ items: SentNotificationItem[] }>('/notifications/sent');
}

export function useSentNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.sent,
    queryFn: () => fetchSentNotifications(),
  });
}

/** `POST /notifications` — envoyer une nouvelle annonce/convocation/incident. */
export function createNotification(payload: CreateNotificationPayload) {
  return api.post<SentNotificationItem>('/notifications', payload);
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNotificationPayload) => createNotification(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/** `PATCH /notifications/:id/read` — marquer une notification comme lue. */
export function markNotificationRead(id: number) {
  return api.patch<{ success: boolean }>(`/notifications/${id}/read`);
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/** `POST /notifications/read-all` — marquer toutes les notifications comme lues. */
export function markAllNotificationsRead() {
  return api.post<{ success: boolean; count: number }>('/notifications/read-all');
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
