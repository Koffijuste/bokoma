// app/(public)/auth/register/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/services';
import { ROUTES } from '@/constants';
import { validEmail, validPassword } from '@/utils/helpers';
import { toast } from 'sonner';

const COUNTRIES = [
  { value: 'CD', label: '🇨🇩 RDC' },
  { value: 'CG', label: '🇨🇬 Congo-Brazzaville' },
  { value: 'CM', label: '🇨🇲 Cameroun' },
  { value: 'GA', label: '🇬🇦 Gabon' },
  { value: 'CI', label: '🇨🇮 Côte d\'Ivoire' },
  { value: 'SN', label: '🇸🇳 Sénégal' },
  { value: 'ML', label: '🇲🇱 Mali' },
  { value: 'BF', label: '🇧🇫 Burkina Faso' },
  { value: 'NE', label: '🇳🇪 Niger' },
  { value: 'TD', label: '🇹🇩 Tchad' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'BE', label: '🇧🇪 Belgique' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'US', label: '🇺🇸 États-Unis' },
  { value: 'OTHER', label: '🌍 Autre' },
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'Prénom requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Nom requis';
    if (!formData.email) newErrors.email = 'Email requis';
    else if (!validEmail(formData.email)) newErrors.email = 'Format email invalide';
    
    if (!formData.phone.trim()) newErrors.phone = 'Téléphone requis';
    if (!formData.address.trim()) newErrors.address = 'Adresse requise';
    if (!formData.country) newErrors.country = 'Pays requis';

    if (!formData.password) newErrors.password = 'Mot de passe requis';
    else if (!validPassword(formData.password)) newErrors.password = 'Min. 6 car., 1 maj., 1 chiffre';

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await authApi.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        country: formData.country,
        password: formData.password,
      });
      
      toast.success('🎉 Compte créé avec succès !');
      router.push(ROUTES.AUTH.LOGIN);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Créer un Compte</h1>
            <p className="text-muted-foreground text-sm">Rejoignez la communauté Bokoma</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Votre prénom" 
                    value={formData.firstName} 
                    onChange={handleChange('firstName')} 
                    className={`w-full bg-background border-2 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent transition ${errors.firstName ? 'border-destructive' : 'border-border'}`} 
                  />
                </div>
                {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom</label>
                <input 
                  type="text" 
                  placeholder="Votre nom" 
                  value={formData.lastName} 
                  onChange={handleChange('lastName')} 
                  className={`w-full bg-background border-2 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent transition ${errors.lastName ? 'border-destructive' : 'border-border'}`} 
                />
                {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input 
                  type="email" 
                  placeholder="vous@exemple.com" 
                  value={formData.email} 
                  onChange={handleChange('email')} 
                  className={`w-full bg-background border-2 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent transition ${errors.email ? 'border-destructive' : 'border-border'}`} 
                />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input 
                    type="tel" 
                    placeholder="+243 000 000 000" 
                    value={formData.phone} 
                    onChange={handleChange('phone')} 
                    className={`w-full bg-background border-2 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent transition ${errors.phone ? 'border-destructive' : 'border-border'}`} 
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Pays</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <select 
                    value={formData.country} 
                    onChange={handleChange('country')} 
                    className={`w-full bg-background border-2 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent transition appearance-none ${errors.country ? 'border-destructive' : 'border-border'}`}
                  >
                    <option value="">Sélectionner</option>
                    {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Adresse</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Quartier, Avenue, Commune..." 
                  value={formData.address} 
                  onChange={handleChange('address')} 
                  className={`w-full bg-background border-2 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent transition ${errors.address ? 'border-destructive' : 'border-border'}`} 
                />
              </div>
              {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={formData.password} 
                    onChange={handleChange('password')} 
                    className={`w-full bg-background border-2 rounded-lg pl-10 pr-10 py-2.5 focus:outline-none focus:border-accent transition ${errors.password ? 'border-destructive' : 'border-border'}`} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confirmation</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={formData.confirmPassword} 
                    onChange={handleChange('confirmPassword')} 
                    className={`w-full bg-background border-2 rounded-lg pl-10 pr-10 py-2.5 focus:outline-none focus:border-accent transition ${errors.confirmPassword ? 'border-destructive' : 'border-border'}`} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <Button type="submit" size="lg" variant="primary" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Inscription...
                </>
              ) : (
                'S\'inscrire'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte?{' '}
            <Link href={ROUTES.AUTH.LOGIN} className="font-medium text-accent hover:text-accent/80 transition-colors">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}