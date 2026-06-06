// app/(admin)/dashboard/settings/page.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Bell, Shield, Palette, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRequireAdmin } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, isLoading } = useRequireAdmin();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    emailNotifications: true,
    orderNotifications: true,
    theme: 'system',
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // TODO: Appel API pour sauvegarder les paramètres
      // await apiClient.patch('/users/me', formData);
      
      toast.success('Paramètres sauvegardés avec succès');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-background">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Gérez votre profil et vos préférences</p>
      </motion.header>

      <div className="max-w-2xl space-y-6">
        {/* Profil */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" /> Profil
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="Votre prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+225 07 07 07 07 07"
              />
            </div>
          </form>
        </motion.section>

        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" /> Notifications
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Notifications par email</Label>
                <p className="text-sm text-muted-foreground">Recevoir les mises à jour par email</p>
              </div>
              <input
                type="checkbox"
                checked={formData.emailNotifications}
                onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Notifications de commandes</Label>
                <p className="text-sm text-muted-foreground">Alertes pour nouvelles commandes</p>
              </div>
              <input
                type="checkbox"
                checked={formData.orderNotifications}
                onChange={(e) => handleChange('orderNotifications', e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
            </div>
          </div>
        </motion.section>

        {/* Apparence */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" /> Apparence
          </h2>
          
          <div className="space-y-2">
            <Label htmlFor="theme">Thème de l'interface</Label>
            <select
              id="theme"
              value={formData.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="system">Système</option>
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </div>
        </motion.section>

        {/* Sécurité */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" /> Sécurité
          </h2>
          
          <div className="space-y-4">
            <Button variant="outline" asChild>
              <a href="/auth/reset-password">Changer le mot de passe</a>
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Pour des raisons de sécurité, la déconnexion doit être effectuée depuis le menu principal.
            </p>
          </div>
        </motion.section>

        {/* Bouton sauvegarder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-end"
        >
          <Button 
            type="submit" 
            variant="primary" 
            size="lg"
            onClick={handleSubmit}
            disabled={isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sauvegarde...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Sauvegarder</>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}