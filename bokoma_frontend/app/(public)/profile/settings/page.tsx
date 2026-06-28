// app/(public)/profile/settings/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, Lock, MapPin, Camera, Save, Loader2, 
  Eye, EyeOff, Plus, Trash2, Edit2,
  Shield, Home, Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { useMounted } from '@/hooks/useMounted';
import { apiClient } from '@/services/api';
import { ROUTES } from '@/constants';

interface Address {
  _id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressFormData {
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

type TabId = 'profile' | 'security' | 'addresses' | 'avatar';

const ADDRESS_LABELS = [
  { value: 'Domicile', label: 'Domicile', icon: Home },
  { value: 'Travail', label: 'Travail', icon: Briefcase },
  { value: 'Autre', label: 'Autre', icon: MapPin },
];

const EMPTY_ADDRESS: AddressFormData = {
  label: 'Domicile',
  fullName: '',
  phone: '',
  street: '',
  city: '',
  postalCode: '',
  country: '',
  isDefault: false,
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const mounted = useMounted();

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const passwordStrength = useMemo(() => {
    const pwd = passwordData.newPassword;
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  }, [passwordData.newPassword]);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressData, setAddressData] = useState<AddressFormData>(EMPTY_ADDRESS);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      toast.error('Prénom et nom requis');
      return;
    }

    try {
      setSaving(true);
      await apiClient.patch('/users/me', profileData);
      toast.success('Profil mis à jour avec succès');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Tous les champs sont requis');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      setSaving(true);
      await apiClient.patch('/users/me/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Mot de passe modifié avec succès');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const fetchAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const response = await apiClient.get('/users/me');
      const userData = response?.data?.user || response?.user;
      const userAddresses = userData?.addresses || [];
      setAddresses(Array.isArray(userAddresses) ? userAddresses : []);
    } catch (err) {
      console.error('❌ Failed to fetch addresses:', err);
      toast.error('Impossible de charger les adresses');
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [activeTab, fetchAddresses]);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addressData.fullName || !addressData.phone || !addressData.street || !addressData.city) {
      toast.error('Champs requis manquants');
      return;
    }

    try {
      setSaving(true);

      if (editingAddress) {
        await apiClient.patch(`/users/me/addresses/${editingAddress._id}`, addressData);
        toast.success('Adresse mise à jour');
      } else {
        await apiClient.post('/users/me/addresses', addressData);
        toast.success('Adresse ajoutée');
      }

      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressData(EMPTY_ADDRESS);
      await fetchAddresses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Supprimer cette adresse ?')) return;

    try {
      await apiClient.delete(`/users/me/addresses/${addressId}`);
      toast.success('Adresse supprimée');
      await fetchAddresses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erreur lors de la suppression');
    }
  };

  const startEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressData({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setShowAddressForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelAddressEdit = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressData(EMPTY_ADDRESS);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Seules les images sont acceptées');
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 30MB)');
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!avatarFile) {
      toast.error('Sélectionnez une image');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await apiClient.patch('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Avatar mis à jour');
      
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(null);
      setAvatarPreview(null);
      
      window.location.reload();
    } catch (err: any) {
      console.error('❌ [AVATAR] Erreur:', err);
      toast.error(err?.message || 'Erreur lors de l\'upload');
    } finally {
      setSaving(false);
    }
  };

  const cancelAvatarChange = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const avatarUrl = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar) return user.avatar;
    return `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=a855f7&color=fff&size=128`;
  }, [avatarPreview, user?.avatar, user?.firstName, user?.lastName]);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-accent" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Connexion requise</h2>
          <p className="text-muted-foreground mb-6">
            Veuillez vous connecter pour accéder aux paramètres.
          </p>
          <Button asChild variant="primary" size="lg">
            <Link href={`${ROUTES.AUTH.LOGIN}?from=/profile/settings`}>
              Se connecter
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as TabId, label: 'Profil', icon: User },
    { id: 'security' as TabId, label: 'Sécurité', icon: Lock },
    { id: 'addresses' as TabId, label: 'Adresses', icon: MapPin, badge: addresses.length },
    { id: 'avatar' as TabId, label: 'Avatar', icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href={ROUTES.USER.PROFILE || '/profile'} className="hover:text-accent transition">
              Profil
            </Link>
            <span>/</span>
            <span>Paramètres</span>
          </div>
          <h1 className="text-3xl font-bold">Paramètres du compte</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos informations personnelles et vos préférences
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-card border border-border rounded-xl p-2 space-y-1 sticky top-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all',
                      activeTab === tab.id
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium flex-1">{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold',
                        activeTab === tab.id
                          ? 'bg-background/20'
                          : 'bg-accent/10 text-accent'
                      )}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="lg:col-span-3 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
            {activeTab === 'profile' && (
              <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-semibold mb-6">Informations personnelles</h2>
                
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom *</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Votre prénom"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom *</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      L'email ne peut pas être modifié
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+225 07 07 07 07 07"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" variant="primary" disabled={saving}>
                      {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" />Enregistrer</>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-semibold mb-6">Changer le mot de passe</h2>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mot de passe actuel *</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.current ? 'Masquer' : 'Afficher'}
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe *</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.new ? 'Masquer' : 'Afficher'}
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {passwordData.newPassword && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[0, 25, 50, 75].map((threshold, i) => (
                            <div
                              key={i}
                              className={cn(
                                'h-1 flex-1 rounded-full transition-colors',
                                passwordStrength > threshold ? 'bg-emerald-500' : 'bg-muted'
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Force : {passwordStrength <= 25 ? 'Faible' : passwordStrength <= 50 ? 'Moyenne' : passwordStrength <= 75 ? 'Bonne' : 'Excellente'}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Minimum 8 caractères, une majuscule et un chiffre
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.confirm ? 'Masquer' : 'Afficher'}
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordData.confirmPassword && (
                      <p className={cn(
                        'text-xs',
                        passwordData.newPassword === passwordData.confirmPassword
                          ? 'text-emerald-600'
                          : 'text-destructive'
                      )}>
                        {passwordData.newPassword === passwordData.confirmPassword
                          ? '✓ Les mots de passe correspondent'
                          : '✗ Les mots de passe ne correspondent pas'}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" variant="primary" disabled={saving}>
                      {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Modification...</>
                      ) : (
                        <><Lock className="w-4 h-4 mr-2" />Modifier le mot de passe</>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Mes adresses</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (showAddressForm) {
                        cancelAddressEdit();
                      } else {
                        setAddressData(EMPTY_ADDRESS);
                        setShowAddressForm(true);
                      }
                    }}
                  >
                    {showAddressForm ? (
                      <>Annuler</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" />Ajouter</>
                    )}
                  </Button>
                </div>

                {showAddressForm && (
                  <form
                    onSubmit={handleAddressSubmit}
                    className="mb-6 p-4 bg-muted/30 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
                  >
                    <h3 className="font-medium">
                      {editingAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Libellé</Label>
                        <select
                          value={addressData.label}
                          onChange={(e) => setAddressData(prev => ({ ...prev, label: e.target.value }))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                        >
                          {ADDRESS_LABELS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nom complet *</Label>
                        <Input
                          value={addressData.fullName}
                          onChange={(e) => setAddressData(prev => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Jean Dupont"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Téléphone *</Label>
                        <Input
                          value={addressData.phone}
                          onChange={(e) => setAddressData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+225 07 07 07 07 07"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Code postal</Label>
                        <Input
                          value={addressData.postalCode}
                          onChange={(e) => setAddressData(prev => ({ ...prev, postalCode: e.target.value }))}
                          placeholder="00225"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Rue *</Label>
                      <Input
                        value={addressData.street}
                        onChange={(e) => setAddressData(prev => ({ ...prev, street: e.target.value }))}
                        placeholder="123 Rue de la Paix"
                        required
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ville *</Label>
                        <Input
                          value={addressData.city}
                          onChange={(e) => setAddressData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Abidjan"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pays *</Label>
                        <Input
                          value={addressData.country}
                          onChange={(e) => setAddressData(prev => ({ ...prev, country: e.target.value }))}
                          placeholder="Côte d'Ivoire"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={addressData.isDefault}
                        onChange={(e) => setAddressData(prev => ({ ...prev, isDefault: e.target.checked }))}
                        className="w-4 h-4 accent-accent"
                      />
                      <Label htmlFor="isDefault" className="cursor-pointer">
                        Adresse par défaut
                      </Label>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={cancelAddressEdit}>
                        Annuler
                      </Button>
                      <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
                        ) : (
                          <><Save className="w-4 h-4 mr-2" />Enregistrer</>
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {loadingAddresses ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune adresse enregistrée</p>
                    <p className="text-sm mt-2">Cliquez sur "Ajouter" pour créer votre première adresse</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {addresses.map((address, index) => {
                      const LabelIcon = ADDRESS_LABELS.find(l => l.value === address.label)?.icon || MapPin;
                      
                      return (
                        <div
                          key={address._id}
                          className={cn(
                            'p-4 border rounded-lg relative group animate-in fade-in slide-in-from-bottom-2 duration-300',
                            address.isDefault ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                          )}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {address.isDefault && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-full font-medium">
                              Par défaut
                            </span>
                          )}
                          <div className="flex items-start gap-2 mb-2">
                            <LabelIcon className="w-4 h-4 text-accent mt-0.5" />
                            <div>
                              <p className="font-medium">{address.label}</p>
                              <p className="text-sm text-muted-foreground">{address.fullName}</p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1 ml-6">
                            <p>{address.street}</p>
                            <p>{address.city}{address.postalCode ? `, ${address.postalCode}` : ''}</p>
                            <p>{address.country}</p>
                            <p>{address.phone}</p>
                          </div>
                          <div className="flex gap-2 mt-3 ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditAddress(address)}
                              className="h-7 px-2"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAddress(address._id)}
                              className="h-7 px-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'avatar' && (
              <div className="bg-card border border-border rounded-xl p-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-semibold mb-6">Photo de profil</h2>
                
                <form onSubmit={handleAvatarSubmit} className="max-w-md space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-accent/20"
                      />
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm text-blue-700">
                    <p className="font-medium mb-1">Recommandations</p>
                    <ul className="text-xs text-blue-600/80 space-y-1 list-disc list-inside">
                      <li>Format : JPG, PNG ou WEBP</li>
                      <li>Taille maximale : 30MB</li>
                      <li>Dimensions recommandées : 400x400px</li>
                    </ul>
                  </div>

                  {avatarFile && (
                    <div className="p-3 bg-muted rounded-lg text-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <p className="font-medium truncate">{avatarFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(avatarFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelAvatarChange}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    {avatarFile && (
                      <Button type="button" variant="outline" onClick={cancelAvatarChange}>
                        Annuler
                      </Button>
                    )}
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={saving || !avatarFile}
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Upload...</>
                      ) : (
                        <><Camera className="w-4 h-4 mr-2" />Mettre à jour</>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}