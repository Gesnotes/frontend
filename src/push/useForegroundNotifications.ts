import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { paths } from '../routes/paths';
import { useToast } from '../ui';
import { onForegroundMessage } from './push';

/**
 * Relais des notifications reçues **application ouverte**, pour tout l'espace
 * parent.
 *
 * FCM n'affiche rien de lui-même quand l'onglet est au premier plan : sans ce
 * relais, un parent en train de consulter n'importe quel écran ne verrait pas
 * passer la note qui vient d'arriver. Monté une seule fois dans la coquille
 * parent, il ouvre directement le détail de la note concernée — le même
 * résultat que le clic sur une notification système en arrière-plan.
 */
export function useForegroundNotifications() {
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void onForegroundMessage((message) => {
      toast.info(message.body || message.title);
      if (message.gradeId) navigate(paths.parent.grade(message.gradeId));
    }).then((fn) => {
      unsubscribe = fn;
    });
    return () => unsubscribe?.();
  }, [toast, navigate]);
}
