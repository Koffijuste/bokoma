// app/(admin)/dashboard/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, Search, User as UserIcon, Shield, CheckCircle, Ban, MoreVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { userApi } from '@/services';
import { useRequireAdmin } from '@/hooks/useAuth';
import { formatDate } from '@/utils/helpers';
import { toast } from 'sonner';
import type { User, UserRole } from '@/types';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Tous les rôles' },
  { value: 'admin', label: 'Administrateur' },
  { value: 'manager', label: 'Gestionnaire' },
  { value: 'customer', label: 'Client' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  manager: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  customer: 'bg-muted text-muted-foreground border-border',
};

const UserAvatar = ({ 
  user, 
  size = 'md',
  showFallback = true 
}: { 
  user: User; 
  size?: 'sm' | 'md' | 'lg';
  showFallback?: boolean;
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-14 h-14 text-xl',
  };

  const getInitials = () => {
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const isValidAvatarUrl = user.avatar && 
    typeof user.avatar === 'string' && 
    (user.avatar.startsWith('http://') || 
     user.avatar.startsWith('https://') || 
     user.avatar.startsWith('/'));

  if (!isValidAvatarUrl || hasError) {
    if (!showFallback) return null;
    
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold flex-shrink-0`}>
        {getInitials()}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 relative bg-accent/20`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
        </div>
      )}
      <img
        src={user.avatar}
        alt={`${user.firstName} ${user.lastName}`}
        className="w-full h-full object-cover"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
};

const getErrorMessage = (err: any): string => {
  if (!err) return 'Erreur inconnue';
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.statusText) return `Erreur ${err.response.status}: ${err.response.statusText}`;
  if (err.message) return err.message;
  if (typeof err === 'object' && err.message) return err.message;
  if (typeof err === 'string') return err;
  return 'Erreur lors du chargement des données';
};

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function UsersAdminPage() {
  useRequireAdmin();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userList = await userApi.getUsers({ page: 1, limit: 100 });
      
      setUsers(Array.isArray(userList) ? userList : []);
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !search || 
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    if (updating === userId) return;
    setUpdating(userId);
    
    try {
      await userApi.updateUserRole(userId, newRole);
      toast.success(`Rôle mis à jour en "${newRole}"`);
      
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      setSelectedUser(prev => prev?._id === userId ? { ...prev, role: newRole } : prev);
    } catch (err: any) {
      console.error('❌ Role update error:', err);
      const msg = getErrorMessage(err);
      toast.error(msg);
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (updating === userId) return;
    setUpdating(userId);
    
    try {
      await userApi.toggleUserStatus(userId, !currentStatus);
      toast.success(`Compte ${currentStatus ? 'désactivé' : 'réactivé'}`);
      
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
      setSelectedUser(prev => prev?._id === userId ? { ...prev, isActive: !currentStatus } : prev);
    } catch (err: any) {
      console.error('❌ Status toggle error:', err);
      const msg = getErrorMessage(err);
      toast.error(msg);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les comptes et les permissions.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {users.length} utilisateur{users.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
          <Ban className="w-4 h-4 flex-shrink-0"/>
          <p className="text-sm">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto -mr-2 h-6 px-2"
            onClick={() => setError(null)}
          >
            <X className="w-3 h-3"/>
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-card border animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4"/>
            </button>
          )}
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrer par rôle"/>
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                {['Utilisateur', 'Email', 'Rôle', 'Statut', 'Inscription', ''].map((h, i) => (
                  <th 
                    key={i} 
                    className={cn(
                      "px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                      i === 5 && "text-right"
                    )}
                  >
                    {h || '\u00A0'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin"/>
                      <span>Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <UserIcon className="w-10 h-10 opacity-40"/>
                      <p className="font-medium">Aucun utilisateur trouvé</p>
                      {(search || roleFilter !== 'all') && (
                        <Button variant="link" size="sm" onClick={() => { setSearch(''); setRoleFilter('all'); }}>
                          Effacer les filtres
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr 
                    key={user._id}
                    className="hover:bg-accent/5 transition-colors group animate-in fade-in slide-in-from-left-2 duration-300"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.phone || '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 sm:px-6 py-4">
                      <p className="text-sm truncate max-w-[180px]" title={user.email}>{user.email}</p>
                    </td>

                    <td className="px-4 sm:px-6 py-4">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs font-medium", ROLE_COLORS[user.role] || ROLE_COLORS.customer)}
                      >
                        {user.role}
                      </Badge>
                    </td>

                    <td className="px-4 sm:px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-medium",
                        user.isActive ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                      )}>
                        {user.isActive ? <CheckCircle className="w-3.5 h-3.5"/> : <Ban className="w-3.5 h-3.5"/>}
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>

                    <td className="px-4 sm:px-6 py-4">
                      <p className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</p>
                    </td>

                    <td className="px-4 sm:px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { setSelectedUser(user); setModalOpen(true); }}
                        aria-label="Voir les détails"
                      >
                        <MoreVertical className="w-4 h-4"/>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails de l'utilisateur</DialogTitle>
            <DialogDescription>
              Modifiez le rôle ou le statut du compte.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl">
                <UserAvatar user={selectedUser} size="lg" />
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Téléphone</span>
                  <p className="font-medium mt-0.5">{selectedUser.phone || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Inscrit le</span>
                  <p className="font-medium mt-0.5">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground"/> Rôle
                  </label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(val) => handleRoleUpdate(selectedUser._id, val as UserRole)}
                    disabled={updating === selectedUser._id}
                  >
                    <SelectTrigger className={cn(updating === selectedUser._id && "opacity-60")}>
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.filter(r => r.value !== 'all').map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-muted-foreground"/> Statut du compte
                  </label>
                  <Button
                    variant={selectedUser.isActive ? "destructive" : "secondary"}
                    size="sm"
                    onClick={() => handleToggleStatus(selectedUser._id, selectedUser.isActive)}
                    disabled={updating === selectedUser._id}
                    className="w-full"
                  >
                    {updating === selectedUser._id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                    ) : selectedUser.isActive ? (
                      <Ban className="w-4 h-4 mr-2"/>
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2"/>
                    )}
                    {selectedUser.isActive ? 'Désactiver le compte' : 'Réactiver le compte'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Fermer</Button>
            </DialogClose>
          </DialogFooter>
          <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted transition-colors">
            <X className="w-4 h-4"/>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}