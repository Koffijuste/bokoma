// app/(admin)/dashboard/settings/page.tsx
// ============================================================================
// ⚙️  PAGE PARAMÈTRES — Refonte UX (onglets + Zod + dirty tracking)
// ============================================================================
// Layout :
//   - Sidebar d'onglets (desktop) / onglets horizontaux (mobile)
//   - 4 sections : Profil · Sécurité · Notifications · Apparence
//   - Indicateur "Non sauvegardé" par section
//   - Barre flottante globale si modifs en attente
//   - Validation Zod côté client (mêmes règles que le backend)
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Save, User, Bell, Shield, Palette, Loader2, Lock, Mail, Phone,
  AlertTriangle, Check, Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useRequireAdmin } from '@/hooks/useAuth';
import { useAuthStore } from '@/store';
import { useTheme } from 'next-themes';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import { userApi } from '@/services';
import { profileSchema, passwordSchema } from '@/lib/validators/settings';
import { SettingSection } from '@/components/settings/SettingSection';
import { SettingsTabs, type SettingsTab } from '@/components/settings/SettingsTabs';
import { PasswordInput } from '@/components/settings/PasswordInput';
import { DirtySaveBar } from '@/components/settings/DirtySaveBar';
import { toast } from 'sonner';

// ─── Helpers ────────────────────────────────────────────────────────────────
type FieldErrors = Record<string, string>;

const formatZodErrors = (zodErr: any): FieldErrors => {
  // ✅ Tolère Zod v3 et v4
  const issues = zodErr?.issues ?? zodErr?.errors ?? [];
  const out: FieldErrors = {};
  for (const issue of issues) {
    const path = Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? '');
    if (path && !out[path]) out[path] = issue.message ?? 'Champ invalide';
  }
  return out;
};

const isSame = (a: Record<string, any>, b: Record<string, any>) =>
  JSON.stringify(a) === JSON.stringify(b);

// ─── IDs des onglets ────────────────────────────────────────────────────────
const TABS = {
  PROFILE: 'profile',
  SECURITY: 'security',
  NOTIFICATIONS: 'notifications',
  APPEARANCE: 'appearance',
} as const;
type TabId = (typeof TABS)[keyof typeof TABS];

// ============================================================================
// 🔹 COMPOSANT PRINCIPAL
// ============================================================================

export default function SettingsPage() {
  const { user, isLoading } = useRequireAdmin();
  const setUser = useAuthStore((s) => s.setUser);
  // ✅ Source de vérité unique pour le thème : `next-themes` (déjà câblé
  //    dans providers.tsx). Le bouton Night/Light du header et le toggler
  //    de cette page partagent maintenant la même logique → class="dark"
  //    sur <html>, ce qui fait basculer tout Tailwind `dark:*`.
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const theme = (mounted && resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  const { prefs, hydrated: prefsHydrated, updatePref } = useNotificationPrefs();

  const [activeTab, setActiveTab] = useState<TabId>(TABS.PROFILE);

  // États "dirty" par section — agrégés pour la barre flottante
  const [dirtyMap, setDirtyMap] = useState<Record<TabId, boolean>>({
    [TABS.PROFILE]: false,
    [TABS.SECURITY]: false,
    [TABS.NOTIFICATIONS]: false,
    [TABS.APPEARANCE]: false,
  });

  // Refs vers les fonctions de sauvegarde de chaque section, pour la
  // barre flottante qui agit sur la section active.
  const saveFns = useRef<Partial<Record<TabId, () => Promise<void>>>>({});

  const markDirty = useCallback((tab: TabId, dirty: boolean) => {
    setDirtyMap((prev) => (prev[tab] === dirty ? prev : { ...prev, [tab]: dirty }));
  }, []);

  const registerSave = useCallback(
    (tab: TabId, fn: () => Promise<void>) => {
      saveFns.current[tab] = fn;
    },
    []
  );

  const anyDirty = Object.values(dirtyMap).some(Boolean);
  const dirtyCount = Object.values(dirtyMap).filter(Boolean).length;

  if (isLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const tabs: SettingsTab[] = [
    { id: TABS.PROFILE,       label: 'Profil',        icon: <User /> },
    { id: TABS.SECURITY,      label: 'Sécurité',      icon: <Shield /> },
    {
      id: TABS.NOTIFICATIONS,
      label: 'Notifications',
      icon: <Bell />,
      // ✅ Badge uniquement si au moins une notif est désactivée
      badge: prefsHydrated && (!prefs.emailNotifications || !prefs.orderNotifications)
        ? '!'
        : undefined,
    },
    { id: TABS.APPEARANCE,    label: 'Apparence',     icon: <Palette /> },
  ];

  const handleGlobalSave = async () => {
    const fn = saveFns.current[activeTab];
    if (!fn) return;
    await fn();
  };

  const handleGlobalDiscard = () => {
    // Recharger la page restaure les valeurs initiales.
    // Pour ne pas perdre d'autres onglets en cours, on invalide juste l'onglet actif
    // via un event custom que chaque section écoute.
    window.dispatchEvent(new CustomEvent(`bokoma:settings:discard:${activeTab}`));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-background">
      <header className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez votre profil, sécurité et préférences.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        <SettingsTabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

        <div className="flex-1 max-w-2xl space-y-6">
          {activeTab === TABS.PROFILE && (
            <ProfileSection
              user={user}
              onDirtyChange={(d) => markDirty(TABS.PROFILE, d)}
              onRegisterSave={(fn) => registerSave(TABS.PROFILE, fn)}
            />
          )}
          {activeTab === TABS.SECURITY && (
            <SecuritySection
              onDirtyChange={(d) => markDirty(TABS.SECURITY, d)}
              onRegisterSave={(fn) => registerSave(TABS.SECURITY, fn)}
            />
          )}
          {activeTab === TABS.NOTIFICATIONS && (
            <NotificationsSection
              hydrated={prefsHydrated}
              prefs={prefs}
              onChange={(key, value) => {
                updatePref(key, value);
                toast.success('Préférence mise à jour', { duration: 1500 });
              }}
              onDirtyChange={() => {
                // Pas de "save" → pas de dirty. Toujours false.
                markDirty(TABS.NOTIFICATIONS, false);
              }}
            />
          )}
          {activeTab === TABS.APPEARANCE && (
            <AppearanceSection
              theme={theme}
              onThemeChange={(newTheme) => {
                setTheme(newTheme);
                toast.success('Thème mis à jour', { duration: 1500 });
              }}
              onDirtyChange={() => markDirty(TABS.APPEARANCE, false)}
            />
          )}
        </div>
      </div>

      <DirtySaveBar
        visible={anyDirty && (activeTab === TABS.PROFILE || activeTab === TABS.SECURITY)}
        onSave={handleGlobalSave}
        onDiscard={handleGlobalDiscard}
        message={
          dirtyCount > 1
            ? `${dirtyCount} sections ont des modifications non sauvegardées`
            : 'Vous avez des modifications non sauvegardées'
        }
      />
    </div>
  );
}

// ============================================================================
// 🔹 SECTION PROFIL
// ============================================================================

interface ProfileSectionProps {
  user: any;
  onDirtyChange: (dirty: boolean) => void;
  onRegisterSave: (fn: () => Promise<void>) => void;
}

function ProfileSection({ user, onDirtyChange, onRegisterSave }: ProfileSectionProps) {
  const setUser = useAuthStore((s) => s.setUser);

  const initial = useMemo(
    () => ({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    }),
    [user]
  );

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Sync si le user change (ex: après refresh du store)
  useEffect(() => {
    setForm(initial);
    setErrors({});
    onDirtyChange(false);
  }, [initial, onDirtyChange]);

  // Détection "dirty"
  useEffect(() => {
    onDirtyChange(!isSame(form, initial));
  }, [form, initial, onDirtyChange]);

  const handleChange = useCallback((field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ à la frappe
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const validate = useCallback((): FieldErrors => {
    const r = profileSchema.safeParse(form);
    return r.success ? {} : formatZodErrors(r.error);
  }, [form]);

  const handleSave = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    setSaving(true);
    try {
      const updated = await userApi.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      // ✅ Mettre à jour le store pour que la Navbar reflète le nouveau nom
      setUser({ ...user, ...updated });
      toast.success('Profil mis à jour');
      onDirtyChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erreur lors de la sauvegarde';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [form, validate, setUser, user, onDirtyChange]);

  // Reset si discard global
  useEffect(() => {
    const reset = () => {
      setForm(initial);
      setErrors({});
      onDirtyChange(false);
      toast.info('Modifications annulées');
    };
    window.addEventListener('bokoma:settings:discard:profile', reset);
    return () => window.removeEventListener('bokoma:settings:discard:profile', reset);
  }, [initial, onDirtyChange]);

  // Expose save pour la barre flottante
  useEffect(() => {
    onRegisterSave(handleSave);
  }, [handleSave, onRegisterSave]);

  return (
    <SettingSection
      title="Profil"
      description="Vos informations personnelles visibles sur votre compte."
      icon={<User className="w-5 h-5" />}
      delay={100}
      isDirty={!isSame(form, initial) && !saving}
      footer={
        <Button onClick={handleSave} disabled={saving || isSame(form, initial)}>
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sauvegarde...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Sauvegarder</>
          )}
        </Button>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Prénom"
          value={form.firstName}
          onChange={(e) => handleChange('firstName', e.target.value)}
          error={errors.firstName}
          placeholder="Votre prénom"
          autoComplete="given-name"
          required
        />
        <Input
          label="Nom"
          value={form.lastName}
          onChange={(e) => handleChange('lastName', e.target.value)}
          error={errors.lastName}
          placeholder="Votre nom"
          autoComplete="family-name"
          required
        />
      </div>

      <Input
        label="Email"
        value={user.email || ''}
        disabled
        icon={<Mail className="w-4 h-4" />}
        helperText="L'email est lié à votre compte et ne peut pas être modifié ici."
      />

      <Input
        label="Téléphone"
        value={user.phone || ''}
        disabled
        icon={<Phone className="w-4 h-4" />}
        helperText="Le téléphone est lié à votre compte et ne peut pas être modifié ici."
        autoComplete="tel"
      />
    </SettingSection>
  );
}

// ============================================================================
// 🔹 SECTION SÉCURITÉ
// ============================================================================

interface SecuritySectionProps {
  onDirtyChange: (dirty: boolean) => void;
  onRegisterSave: (fn: () => Promise<void>) => void;
}

const EMPTY_PWD = { currentPassword: '', newPassword: '', confirmPassword: '' };

function SecuritySection({ onDirtyChange, onRegisterSave }: SecuritySectionProps) {
  const [pwd, setPwd] = useState(EMPTY_PWD);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(() => !isSame(pwd, EMPTY_PWD), [pwd]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleChange = useCallback((field: keyof typeof pwd, value: string) => {
    setPwd((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const validate = useCallback((): FieldErrors => {
    const r = passwordSchema.safeParse(pwd);
    return r.success ? {} : formatZodErrors(r.error);
  }, [pwd]);

  const handleSave = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    setSaving(true);
    try {
      await userApi.updatePassword(pwd.currentPassword, pwd.newPassword);
      toast.success('Mot de passe modifié avec succès');
      setPwd(EMPTY_PWD);
      onDirtyChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erreur lors du changement';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [pwd, validate, onDirtyChange]);

  // Reset si discard global
  useEffect(() => {
    const reset = () => {
      setPwd(EMPTY_PWD);
      setErrors({});
      onDirtyChange(false);
      toast.info('Modifications annulées');
    };
    window.addEventListener('bokoma:settings:discard:security', reset);
    return () => window.removeEventListener('bokoma:settings:discard:security', reset);
  }, [onDirtyChange]);

  // Expose save
  useEffect(() => {
    onRegisterSave(handleSave);
  }, [handleSave, onRegisterSave]);

  // Indicateur visuel : passwords match ?
  const passwordsMatch =
    pwd.confirmPassword.length > 0 && pwd.newPassword === pwd.confirmPassword;
  const passwordsMismatch =
    pwd.confirmPassword.length > 0 && pwd.newPassword !== pwd.confirmPassword;

  return (
    <SettingSection
      title="Sécurité"
      description="Modifiez votre mot de passe. Choisissez-en un solide (8+ caractères, majuscule, chiffre)."
      icon={<Shield className="w-5 h-5" />}
      delay={100}
      isDirty={isDirty && !saving}
      footer={
        <Button onClick={handleSave} disabled={saving || !isDirty}>
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Modification...</>
          ) : (
            <><Lock className="w-4 h-4 mr-2" /> Changer le mot de passe</>
          )}
        </Button>
      }
    >
      <PasswordInput
        label="Mot de passe actuel"
        value={pwd.currentPassword}
        onChange={(e) => handleChange('currentPassword', e.target.value)}
        error={errors.currentPassword}
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />
      <PasswordInput
        label="Nouveau mot de passe"
        value={pwd.newPassword}
        onChange={(e) => handleChange('newPassword', e.target.value)}
        error={errors.newPassword}
        placeholder="••••••••"
        autoComplete="new-password"
        required
      />

      <div>
        <PasswordInput
          label="Confirmer le nouveau mot de passe"
          value={pwd.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
        {passwordsMatch && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
            <Check className="w-3 h-3" /> Les mots de passe correspondent
          </p>
        )}
        {passwordsMismatch && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3" /> Les mots de passe ne correspondent pas
          </p>
        )}
      </div>

      <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Règles de robustesse :</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Au moins 8 caractères</li>
          <li>Au moins une majuscule</li>
          <li>Au moins un chiffre</li>
          <li>Différent de votre mot de passe actuel</li>
        </ul>
      </div>
    </SettingSection>
  );
}

// ============================================================================
// 🔹 SECTION NOTIFICATIONS
// ============================================================================

interface NotificationsSectionProps {
  prefs: {
    emailNotifications: boolean;
    orderNotifications: boolean;
    marketingNotifications: boolean;
  };
  hydrated: boolean;
  onChange: <K extends keyof NotificationsSectionProps['prefs']>(
    key: K,
    value: NotificationsSectionProps['prefs'][K]
  ) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const NOTIF_ITEMS: Array<{
  key: keyof NotificationsSectionProps['prefs'];
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'emailNotifications',
    title: 'Notifications par email',
    description: 'Recevoir des emails pour les événements importants.',
    icon: <Mail className="w-5 h-5" />,
  },
  {
    key: 'orderNotifications',
    title: 'Alertes de commandes',
    description: 'Notification instantanée pour chaque nouvelle commande.',
    icon: <Smartphone className="w-5 h-5" />,
  },
  {
    key: 'marketingNotifications',
    title: 'Promotions & nouveautés',
    description: 'Recevoir nos offres et nouveaux produits.',
    icon: <Bell className="w-5 h-5" />,
  },
];

function NotificationsSection({
  prefs,
  hydrated,
  onChange,
  onDirtyChange,
}: NotificationsSectionProps) {
  useEffect(() => {
    onDirtyChange(false); // Pas de save manuel → pas de dirty
  }, [onDirtyChange]);

  if (!hydrated) {
    return (
      <SettingSection
        title="Notifications"
        description="Choisissez comment vous souhaitez être prévenu."
        icon={<Bell className="w-5 h-5" />}
        delay={100}
      >
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </SettingSection>
    );
  }

  return (
    <SettingSection
      title="Notifications"
      description="Choisissez comment vous souhaitez être prévenu. Vos préférences sont sauvegardées automatiquement."
      icon={<Bell className="w-5 h-5" />}
      delay={100}
    >
      {NOTIF_ITEMS.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0"
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-muted-foreground mt-0.5">{item.icon}</span>
            <div className="min-w-0">
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>
          <Switch
            checked={prefs[item.key]}
            onCheckedChange={(checked) => onChange(item.key, checked)}
            aria-label={item.title}
          />
        </div>
      ))}

      <p className="text-xs text-muted-foreground pt-2">
        💡 Stockées localement dans votre navigateur. Une synchronisation serveur est prévue bientôt.
      </p>
    </SettingSection>
  );
}

// ============================================================================
// 🔹 SECTION APPARENCE
// ============================================================================

interface AppearanceSectionProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onDirtyChange: (dirty: boolean) => void;
}

function AppearanceSection({ theme, onThemeChange, onDirtyChange }: AppearanceSectionProps) {
  useEffect(() => {
    onDirtyChange(false);
  }, [onDirtyChange]);

  return (
    <SettingSection
      title="Apparence"
      description="Personnalisez l'apparence de l'interface."
      icon={<Palette className="w-5 h-5" />}
      delay={100}
    >
      <div>
        <label className="text-sm font-medium block mb-2">Thème</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              theme === 'light'
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <div className="w-full h-16 rounded-lg bg-gradient-to-br from-white to-gray-100 border border-gray-200 mb-2" />
            <p className="font-medium text-sm">Clair</p>
            <p className="text-xs text-muted-foreground">Idéal en plein jour</p>
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              theme === 'dark'
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <div className="w-full h-16 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 border border-gray-800 mb-2" />
            <p className="font-medium text-sm">Sombre</p>
            <p className="text-xs text-muted-foreground">Confort pour les yeux</p>
          </button>
        </div>
      </div>
    </SettingSection>
  );
}