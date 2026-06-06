// utils/avatar.ts
export const getAvatarUrl = (user: any, size: number = 32): string => {
  if (user?.avatar) return user.avatar;
  const initial = user?.firstName?.[0]?.toUpperCase() || 'U';
  return `https://api.placeholder.com/${size}/${size}?text=${encodeURIComponent(initial)}`;
};