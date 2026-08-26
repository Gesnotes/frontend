import { useState, useMemo, type FormEvent } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Eye,
  Megaphone,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react';

import {
  classesApi,
  errorMessage,
  gradesApi,
  notificationsApi,
  studentsApi,
  type NotificationTargetType,
  type NotificationType,
} from '../../api';
import { useAuth } from '../../auth/auth-context';
import { QueryBoundary } from '../../components/QueryBoundary';
import { TermSelect } from '../../layouts/TermSelect';
import { formatDate, formatPercent, formatCount, plural } from '../../lib/format';
import {
  Alert,
  Button,
  Card,
  Chip,
  EmptyState,
  Modal,
  ModalActions,
  Skeleton,
  StatCardIcon,
  useToast,
} from '../../ui';

export default function AnnoncesIncidentsPage() {
  const toast = useToast();
  const { role } = useAuth();
  const isTeacher = role === 'teacher';
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sentQuery = notificationsApi.useSentNotifications();
  const createMutation = notificationsApi.useCreateNotification();

  const adminClassesQuery = classesApi.useClasses();
  const teacherClassesQuery = gradesApi.useMyClasses();

  const availableClasses = isTeacher
    ? teacherClassesQuery.data
      ? Array.from(
          new Map(
            teacherClassesQuery.data.map((a) => [
              a.classId,
              { id: a.classId, name: a.className, level: a.level, effectif: a.effectif },
            ]),
          ).values(),
        )
      : []
    : adminClassesQuery.data ?? [];

  const [parentSearch, setParentSearch] = useState('');
  const [selectedParentName, setSelectedParentName] = useState<string | null>(null);
  const parentSearchQuery = studentsApi.useParentSearch(parentSearch);

  // Filters State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Form State
  const [type, setType] = useState<NotificationType>('annonce');
  const [targetType, setTargetType] = useState<NotificationTargetType>(
    isTeacher ? 'class_parents' : 'school_parents',
  );
  const [targetId, setTargetId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const resetForm = () => {
    setType('annonce');
    setTargetType(isTeacher ? 'class_parents' : 'school_parents');
    setTargetId(null);
    setTitle('');
    setBody('');
    setParentSearch('');
    setSelectedParentName(null);
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    if (!body.trim()) {
      toast.error('Le message est obligatoire');
      return;
    }
    if (targetType !== 'school_parents' && !targetId) {
      toast.error('Veuillez sélectionner un destinataire (classe ou parent)');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        type,
        targetType,
        targetId: targetType === 'school_parents' ? null : targetId,
      });

      toast.success('Annonce / Convocation envoyée avec succès');
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const sentItems = sentQuery.data?.items ?? [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sentItems.filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false;
      if (
        query &&
        !item.title.toLowerCase().includes(query) &&
        !item.body.toLowerCase().includes(query) &&
        !item.creatorName.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [sentItems, search, typeFilter]);

  // Statics
  const totalReadRates = sentItems.reduce((acc, curr) => acc + curr.stats.readPercentage, 0);
  const avgReadRate = sentItems.length > 0 ? Math.round(totalReadRates / sentItems.length) : 0;
  const urgentCount = sentItems.filter((i) => i.type === 'convocation' || i.type === 'incident').length;

  return (
    <>
      {/* En-tête standard */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Annonces & Incidents</h1>
          <p className="mt-1 text-sm text-gray-500">
            {sentQuery.data
              ? `${formatCount(sentItems.length)} ${plural(sentItems.length, 'annonce')} publiée${sentItems.length > 1 ? 's' : ''}`
              : "Diffusion d'annonces, convocations et incidents aux parents"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TermSelect />
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            Créer un envoi
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-8">
        {/* Barre de recherche et filtres */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <label className="relative flex-1 min-w-[220px]">
            <span className="sr-only">Rechercher une annonce</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Rechercher par titre, contenu ou auteur…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Tous les types</option>
            <option value="annonce">📢 Annonces</option>
            <option value="convocation">⚠️ Convocations</option>
            <option value="incident">🚨 Incidents Graves</option>
          </select>
        </div>

        {/* Liste des annonces envoyées */}
        <QueryBoundary query={sentQuery} loading={<TableSkeleton />}>
          {() =>
            filtered.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <p className="font-semibold text-gray-900">
                  {sentItems.length === 0 ? 'Aucune annonce envoyée' : 'Aucune annonce ne correspond à ce filtre'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {sentItems.length === 0
                    ? 'Cliquez sur « Créer un envoi » pour diffuser une annonce, une convocation ou un incident aux parents.'
                    : 'Essayez un autre mot-clé ou réinitialisez les filtres.'}
                </p>
                {sentItems.length === 0 ? (
                  <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                    Créer un envoi
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item) => (
                  <Card key={item.id} padded>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          {item.type === 'incident' ? (
                            <Chip tone="danger">
                              <ShieldAlert size={14} className="mr-1 inline" /> Incident Grave
                            </Chip>
                          ) : item.type === 'convocation' ? (
                            <Chip tone="warning">
                              <AlertTriangle size={14} className="mr-1 inline" /> Convocation
                            </Chip>
                          ) : (
                            <Chip tone="info">
                              <Megaphone size={14} className="mr-1 inline" /> Annonce
                            </Chip>
                          )}

                          <Chip tone="neutral">
                            <Users size={14} className="mr-1 inline" />
                            {item.targetType === 'school_parents'
                              ? 'Toute l’école'
                              : item.targetType === 'class_parents'
                              ? `Classe #${item.targetId}`
                              : `Parent #${item.targetId}`}
                          </Chip>
                        </div>

                        <span className="text-xs text-gray-500">
                          Envoyé le {formatDate(item.createdAt)} par {item.creatorName}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                        <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{item.body}</p>
                      </div>

                      {/* Statistique de lecture */}
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Eye size={16} className="text-gray-400" />
                          Statut de lecture par les familles :
                        </span>
                        <div className="flex items-center gap-3">
                          <span>
                            <strong>{item.stats.readRecipients}</strong> / {item.stats.totalRecipients} parents ont lu
                          </span>
                          <span className="flex items-center gap-1 font-bold text-emerald-600">
                            <CheckCircle2 size={14} />
                            {formatPercent(item.stats.readPercentage)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          }
        </QueryBoundary>

        {/* Stat Cards standard */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCardIcon
            icon={Megaphone}
            tone="bg-blue-50 text-blue-600"
            label="Total des envois"
            value={formatCount(sentItems.length)}
          />
          <StatCardIcon
            icon={Eye}
            tone="bg-emerald-50 text-emerald-600"
            label="Taux de lecture moyen"
            value={`${avgReadRate}%`}
            hint="des parents ont consulté leurs alertes"
          />
          <StatCardIcon
            icon={ShieldAlert}
            tone="bg-amber-50 text-amber-600"
            label="Convocations & Incidents"
            value={formatCount(urgentCount)}
            hint="messages prioritaires"
          />
        </div>
      </div>

      {/* Modal de création aux standards Gesnotes */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Diffuser une communication aux parents"
        subtitle="Annonce générale, convocation ou signalement d'incident"
        footer={
          <ModalActions
            onCancel={() => {
              setIsModalOpen(false);
              resetForm();
            }}
            onConfirm={() => void handleSubmit()}
            confirmLabel="Envoyer l'annonce"
            loading={createMutation.isPending}
          />
        }
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="page-stack" style={{ gap: 'var(--space-4)' }}>
          {/* Étape 1 : Type de message */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              1. Type d'envoi
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  type === 'annonce'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                onClick={() => setType('annonce')}
              >
                <Megaphone size={20} className={type === 'annonce' ? 'text-blue-600' : 'text-gray-400'} />
                Annonce École
              </button>

              <button
                type="button"
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  type === 'convocation'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                onClick={() => setType('convocation')}
              >
                <AlertTriangle size={20} className={type === 'convocation' ? 'text-amber-600' : 'text-gray-400'} />
                Convocation
              </button>

              <button
                type="button"
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  type === 'incident'
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                onClick={() => setType('incident')}
              >
                <ShieldAlert size={20} className={type === 'incident' ? 'text-red-600' : 'text-gray-400'} />
                Incident Grave
              </button>
            </div>
          </div>

          {/* Étape 2 : Destinataires */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              2. Destinataires
            </label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm font-medium text-gray-900 focus:border-primary focus:outline-none"
              value={targetType}
              onChange={(e) => {
                const val = e.target.value as NotificationTargetType;
                setTargetType(val);
                setTargetId(null);
              }}
            >
              {!isTeacher ? <option value="school_parents">Toute l'école (Tous les parents)</option> : null}
              <option value="class_parents">
                {isTeacher ? 'Une de mes classes' : 'Une classe spécifique'}
              </option>
              <option value="parent">Un parent spécifique</option>
            </select>
          </div>

          {/* Si cible = classe */}
          {targetType === 'class_parents' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {isTeacher ? 'Sélectionner une de vos classes' : 'Sélectionner la classe'}
              </label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm font-medium text-gray-900 focus:border-primary focus:outline-none"
                value={targetId ?? ''}
                onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- Choisir une classe --</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level}) — {c.effectif} élèves
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Si cible = parent */}
          {targetType === 'parent' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Rechercher le parent (Nom, Email, Tél)</label>

              {/* Champ de recherche — caché une fois un parent sélectionné */}
              {selectedParentName ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-2.5">
                  <span className="text-sm font-semibold text-blue-800">✔ {selectedParentName}</span>
                  <button
                    type="button"
                    className="ml-3 text-xs text-blue-600 underline hover:text-blue-800"
                    onClick={() => {
                      setTargetId(null);
                      setSelectedParentName(null);
                      setParentSearch('');
                    }}
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none"
                    placeholder="Tapez au moins 2 caractères..."
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    autoFocus
                  />

                  {parentSearchQuery.data && parentSearchQuery.data.length > 0 ? (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-md">
                      {parentSearchQuery.data.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs hover:bg-blue-50 hover:text-blue-800"
                          onClick={() => {
                            setTargetId(p.id);
                            setSelectedParentName(`${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email || String(p.id));
                            setParentSearch('');
                          }}
                        >
                          <span className="font-medium">
                            {p.firstName} {p.lastName}
                          </span>
                          <span className="text-gray-400">{p.email || p.phone}</span>
                        </button>
                      ))}
                    </div>
                  ) : parentSearch.length >= 2 ? (
                    <p className="mt-1 text-xs text-gray-500">Aucun parent trouvé pour cette recherche.</p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {/* Étape 3 : Titre */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              3. Titre
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none"
              placeholder={
                type === 'incident'
                  ? 'Ex: Notification d’incident disciplinaire en classe'
                  : type === 'convocation'
                  ? 'Ex: Convocation avec la direction le 15 Octobre à 10h'
                  : 'Ex: Réunion générale des parents d’élèves'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Étape 4 : Contenu */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              4. Message / Contenu
            </label>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none"
              placeholder="Rédigez le texte complet destiné aux parents..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <Alert tone="info">
            Chaque parent destinataire recevra une notification push sur son téléphone et verra ce message de manière persistante sur son tableau de bord tant qu'il n'aura pas été marqué comme lu.
          </Alert>
        </form>
      </Modal>
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={100} radius={12} />
      ))}
    </div>
  );
}
