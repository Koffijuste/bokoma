// app/(admin)/dashboard/feedbacks/page.tsx
// ============================================================================
// 💬 ADMIN — Modération des feedbacks clients
// ============================================================================
// Optimisé : zéro framer-motion (motion + AnimatePresence).
// Animations CSS natives (scale-in pour modale, fade-up pour cartes).
// ============================================================================
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle2, X, MessageSquare, AlertTriangle, Lightbulb, Star, Wrench,
  Search, Loader2, RefreshCcw, Eye, EyeOff, Reply, ChevronLeft, ChevronRight,
  Calendar, Mail, Trash2, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { feedbackApi } from '@/services';
import { cn, formatDateTime } from '@/utils/helpers';
import type { FeedbackItem, FeedbackStatus, FeedbackCategory } from '@/types';

import {
  AdminHeader, AdminStats, AdminFilters, StaggerList, EmptyState, StatusPill,
  ErrorBanner, InlineSpinner, IconBadge,
} from '@/components/admin/admin-shell';

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 CONSTANTES (hoistées hors du composant pour éviter les recréations)
// ─────────────────────────────────────────────────────────────────────────────

type CategoryColor = 'blue' | 'orange' | 'yellow' | 'amber' | 'emerald';

const CATEGORIES: Record<FeedbackCategory, {
  label: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
  color: CategoryColor;
}> = {
  site_feedback:   { label: 'Avis site',         emoji: '💬', icon: MessageSquare, color: 'blue' },
  purchase_issue:  { label: "Difficulté d'achat", emoji: '⚠️', icon: AlertTriangle, color: 'orange' },
  improvement:     { label: 'Amélioration',      emoji: '💡', icon: Lightbulb,    color: 'yellow' },
  product_opinion: { label: 'Avis produit',      emoji: '⭐', icon: Star,         color: 'amber' },
  after_sales:     { label: 'SAV',               emoji: '🛠️', icon: Wrench,       color: 'emerald' },
};

type StatusPillVariant = 'pending' | 'approved' | 'rejected' | 'archived';

const STATUS_PILL: Record<StatusPillVariant, StatusPillVariant> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  archived: 'archived',
};

const STATUS_LABEL: Record<StatusPillVariant, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  archived: 'Archivé',
};

const STATUS_OPTIONS: StatusPillVariant[] = ['pending', 'approved', 'rejected', 'archived'];

const STATUS_FILTERS: Array<{ key: 'all' | StatusPillVariant; label: string; accent?: 'amber' | 'green' | 'red' | 'accent' }> = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente', accent: 'amber' },
  { key: 'approved', label: 'Approuvés', accent: 'green' },
  { key: 'rejected', label: 'Rejetés', accent: 'red' },
  { key: 'archived', label: 'Archivés' },
];

const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getUserDisplay = (item: FeedbackItem): { name: string; avatarUrl?: string } => {
  if (item.isAnonymous) return { name: 'Anonyme' };
  if (item.authorName) return { name: item.authorName };
  if (typeof item.user === 'object' && item.user) {
    return {
      name: `${item.user.firstName ?? ''} ${item.user.lastName ?? ''}`.trim() || 'Client',
      avatarUrl: item.user.avatar,
    };
  }
  return { name: 'Visiteur' };
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Modale de détail / réponse (CSS animation au lieu de motion)
// ─────────────────────────────────────────────────────────────────────────────

const DetailModal = React.memo(function DetailModal({
  open,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: FeedbackItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = React.useState<FeedbackStatus>('pending');
  const [isPublic, setIsPublic] = React.useState(false);
  const [isAnonymous, setIsAnonymous] = React.useState(false);
  const [response, setResponse] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!open || !item) return;
    setStatus(item.status);
    setIsPublic(item.isPublic);
    setIsAnonymous(item.isAnonymous);
    setResponse(item.adminResponse ?? '');
  }, [open, item]);

  if (!open || !item) return null;

  const cat = CATEGORIES[item.category];
  const Icon = cat.icon;
  const userObj = typeof item.user === 'object' ? item.user : null;
  const authorName = getUserDisplay(item).name;

  const save = async () => {
    setSaving(true);
    try {
      await feedbackApi.adminUpdateStatus(item._id, {
        status,
        isPublic,
        isAnonymous,
        adminResponse: response.trim() || undefined,
      });
      toast.success('Feedback mis à jour');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error('Sauvegarde impossible', { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer définitivement ce feedback ?')) return;
    setDeleting(true);
    try {
      await feedbackApi.adminRemove(item._id);
      toast.success('Feedback supprimé');
      onSaved();
      onClose();
    } catch {
      toast.error('Suppression impossible');
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in"
      >
        {/* Header */}
        <div className="bg-card border-b border-border p-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <IconBadge icon={Icon} color={cat.color} />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {cat.label}
              </p>
              <h3 className="text-lg font-bold truncate">
                {item.subject || 'Sans sujet'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 -m-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                Auteur
              </p>
              <p className="font-semibold">{authorName}</p>
              {item.contactEmail && (
                <a
                  href={`mailto:${item.contactEmail}`}
                  className="text-xs text-accent flex items-center gap-1 mt-1 hover:underline"
                >
                  <Mail className="w-3 h-3" /> {item.contactEmail}
                </a>
              )}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                Soumis le
              </p>
              <p className="font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDateTime(item.createdAt)}
              </p>
              {item.rating != null && (
                <div className="flex items-center gap-0.5 mt-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-3.5 h-3.5',
                        i < (item.rating ?? 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/25',
                      )}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1 tabular-nums">
                    {item.rating}/5
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
              Message
            </p>
            <div className="p-4 rounded-xl bg-muted/40 border border-border whitespace-pre-line text-sm leading-relaxed">
              {item.messageFull || item.message}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-border">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Modération
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-accent/40 outline-none transition"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none mt-6 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                Rendre public
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none mt-6 text-sm">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                Afficher en anonyme
              </label>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 flex items-center gap-1">
                <Reply className="w-3 h-3" />
                Réponse de l'équipe{' '}
                <span className="text-muted-foreground font-normal">(affichée publiquement)</span>
              </label>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                placeholder="Une réponse professionnelle et bienveillante au client…"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
                {response.length} / 2000
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-card border-t border-border p-5 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {deleting ? 'Suppression…' : 'Supprimer'}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Fermer</Button>
            <Button
              onClick={save}
              disabled={saving}
              isLoading={saving}
              className="bg-gradient-to-r from-accent to-purple-500 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Carte feedback (mémoïsée)
// ─────────────────────────────────────────────────────────────────────────────

const FeedbackCard = React.memo(function FeedbackCard({
  item,
  onOpen,
  onQuickAction,
  busy,
}: {
  item: FeedbackItem;
  onOpen: () => void;
  onQuickAction: (item: FeedbackItem, status: FeedbackStatus) => void;
  busy: boolean;
}) {
  const cat = CATEGORIES[item.category];
  const Icon = cat.icon;
  const { name } = getUserDisplay(item);

  return (
    <article
      className="group cursor-pointer rounded-2xl border border-border bg-card p-4 hover:border-accent/40 hover-lift hover:shadow-lg hover:shadow-accent/5 transition-all duration-200"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <IconBadge icon={Icon} color={cat.color} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold truncate">{name}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                {cat.label}
              </span>
              {item.rating != null && (
                <span className="text-xs flex items-center gap-0.5 text-amber-500">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="tabular-nums">{item.rating}/5</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {item.relativeTime || new Date(item.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusPill variant={STATUS_PILL[item.status]} />
          <span className={cn(
            'text-[10px] flex items-center gap-1 font-medium',
            item.isPublic ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}>
            {item.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {item.isPublic ? 'Public' : 'Privé'}
          </span>
        </div>
      </div>

      {item.subject && <p className="font-medium text-sm mb-1">{item.subject}</p>}
      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{item.message}</p>

      {item.adminResponse && (
        <div className="mt-3 p-2.5 rounded-lg bg-accent/5 border border-accent/20 text-xs">
          <span className="font-semibold text-accent flex items-center gap-1 mb-0.5">
            <Reply className="w-3 h-3" /> Votre réponse :
          </span>
          <span className="line-clamp-1 text-muted-foreground">{item.adminResponse}</span>
        </div>
      )}

      {/* Quick actions */}
      <div
        className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-auto">
          Actions rapides
        </span>
        {item.status !== 'approved' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onQuickAction(item, 'approved')}
            className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-600 transition-colors disabled:opacity-50"
            title="Approuver"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}
        {item.status !== 'rejected' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onQuickAction(item, 'rejected')}
            className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-500 transition-colors disabled:opacity-50"
            title="Rejeter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {item.status !== 'archived' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onQuickAction(item, 'archived')}
            className="p-1.5 rounded-md hover:bg-slate-500/10 text-muted-foreground transition-colors disabled:opacity-50"
            title="Archiver"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </article>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔹 Page principale
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminFeedbacksPage() {
  const [items, setItems] = React.useState<FeedbackItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<'all' | FeedbackStatus>('pending');
  const [catFilter, setCatFilter] = React.useState<'all' | FeedbackCategory>('all');
  const [searchInput, setSearchInput] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [pagination, setPagination] = React.useState({ page: 1, pages: 1, total: 0 });
  const [stats, setStats] = React.useState<any>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState<FeedbackItem | null>(null);
  const [refetching, setRefetching] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const cancelledRef = React.useRef(false);

  const fetchItems = React.useCallback(async (page: number) => {
    if (page === 1) setLoading(true); else setRefetching(true);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (catFilter !== 'all') params.category = catFilter;

      const [listResp, statsResp] = await Promise.all([
        feedbackApi.adminList(params),
        page === 1 ? feedbackApi.adminStats() : Promise.resolve(null),
      ]);

      if (cancelledRef.current) return;

      // ✅ Lecture défensive : même approche que la page gallery.
      let meta: { page?: number; pages?: number; total?: number } = {};
      let data: FeedbackItem[] = [];

      if (Array.isArray(listResp)) {
        data = listResp;
      } else {
        const wrapper = (listResp as any)?.data ?? {};
        if (Array.isArray(wrapper)) {
          data = wrapper;
        } else if (Array.isArray(wrapper?.data)) {
          data = wrapper.data;
          meta = wrapper.meta ?? {};
        } else if (Array.isArray((listResp as any)?.data?.data)) {
          data = (listResp as any).data.data;
          meta = (listResp as any).data.meta ?? {};
        }
        if (!meta || Object.keys(meta).length === 0) {
          meta = (listResp as any)?.meta ?? {};
        }
      }

      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        data = data.filter((it) =>
          it.message?.toLowerCase().includes(s) ||
          it.subject?.toLowerCase().includes(s) ||
          it.authorName?.toLowerCase().includes(s),
        );
      }

      setItems(data);
      setPagination({
        page:  meta?.page ?? page,
        pages: meta?.pages ?? 1,
        total: meta?.total ?? data.length,
      });

      const statsPayload = (statsResp as any)?.data ?? statsResp;
      if (statsPayload && typeof statsPayload === 'object') setStats(statsPayload);
    } catch (err: any) {
      toast.error('Erreur de chargement', { description: err?.message });
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        setRefetching(false);
      }
    }
  }, [statusFilter, catFilter, searchQuery]);

  React.useEffect(() => {
    // ✅ On remet le flag à `false` au montage pour gérer correctement React strict-mode
    //    (montage → unmount → remontage : sans reset, le ref restait à `true` et
    //    toutes les requêtes suivantes retournaient tôt en laissant le loader activé).
    cancelledRef.current = false;
    fetchItems(1);
    return () => { cancelledRef.current = true; };
  }, [fetchItems]);

  const openItem = React.useCallback((item: FeedbackItem) => {
    setActiveItem(item);
    setModalOpen(true);
  }, []);

  const handleQuickAction = React.useCallback(async (item: FeedbackItem, status: FeedbackStatus) => {
    setBusyId(item._id);
    try {
      await feedbackApi.adminUpdateStatus(item._id, { status });
      setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, status } : it)));
      toast.success(`Marqué comme ${STATUS_LABEL[status as StatusPillVariant].toLowerCase()}`);
    } catch (err: any) {
      toast.error('Action impossible');
    } finally {
      setBusyId(null);
    }
  }, []);

  const counts = React.useMemo(() => {
    const c = { all: items.length, pending: 0, approved: 0, rejected: 0, archived: 0 };
    items.forEach((it) => { if (c[it.status] !== undefined) (c as any)[it.status] += 1; });
    return c;
  }, [items]);

  const refresh = () => fetchItems(pagination.page);

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Modération des feedbacks"
        description="Approuvez, rejetez ou répondez aux retours clients avant publication."
        icon={<MessageSquare />}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/feedback" target="_blank">
                <Eye className="w-4 h-4 mr-2" />
                Page publique
              </Link>
            </Button>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCcw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Actualiser
            </Button>
          </>
        }
      />

      {stats && (
        <AdminStats
          stats={[
            { label: 'Total',       value: stats.total ?? 0,                              icon: MessageSquare },
            { label: 'En attente',  value: stats.byStatus?.pending ?? 0,                  icon: Eye,         accent: 'amber' },
            { label: 'Approuvés',   value: stats.byStatus?.approved ?? 0,                 icon: CheckCircle2, accent: 'green' },
            {
              label: 'Note moyenne',
              value: stats.avgRating ? `${stats.avgRating}/5` : '—',
              icon: Star,
              accent: 'accent',
            },
          ]}
        />
      )}

      <AdminFilters
        search={
          <form
            onSubmit={(e) => { e.preventDefault(); setSearchQuery(searchInput); }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher message, sujet, auteur…"
              className="pl-9"
            />
          </form>
        }
        chips={STATUS_FILTERS.map((f) => ({
          key: f.key,
          label: f.label,
          count: counts[f.key as keyof typeof counts],
          active: statusFilter === f.key,
          accent: f.accent,
          onClick: () => setStatusFilter(f.key),
        }))}
        extras={
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs focus:ring-2 focus:ring-accent/40 outline-none"
          >
            <option value="all">Toutes catégories</option>
            {Object.entries(CATEGORIES).map(([id, c]) => (
              <option key={id} value={id}>{c.emoji} {c.label}</option>
            ))}
          </select>
        }
      />

      <StaggerList
        items={items}
        getKey={(it) => it._id}
        loading={loading}
        loadingCount={4}
        className="space-y-3"
        emptyState={
          <EmptyState
            icon={MessageSquare}
            title="Aucun feedback"
            description="Les retours clients apparaîtront ici dès qu'ils seront soumis."
          />
        }
        render={(item) => (
          <FeedbackCard
            item={item}
            onOpen={() => openItem(item)}
            onQuickAction={handleQuickAction}
            busy={busyId === item._id}
          />
        )}
      />

      {/* Pagination custom (compacte) */}
      {!loading && items.length > 0 && pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 animate-fade-up">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1 || refetching}
            onClick={() => fetchItems(pagination.page - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Page <span className="font-semibold text-foreground">{pagination.page}</span> / {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages || refetching}
            onClick={() => fetchItems(pagination.page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <DetailModal
        open={modalOpen}
        item={activeItem}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
