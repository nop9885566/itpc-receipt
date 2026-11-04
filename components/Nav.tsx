import LogoutButton from '@/components/LogoutButton';
import { createClient } from '@/lib/supabase/server';
import MainNavLinks from '@/components/MainNavLinks';
import ProfileAvatar from '@/components/ProfileAvatar';

export default async function Nav() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) console.error('Unable to load current user for navigation:', error.message);

  const metadataName = [
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
    user?.user_metadata?.display_name,
  ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const displayName = metadataName?.trim() || user?.email || 'ผู้ใช้งาน';
  const initial = String(displayName).trim().charAt(0).toUpperCase() || 'ผ';
  const avatarPath = user && user.user_metadata?.avatar_path === `${user.id}/avatar`
    ? user.user_metadata.avatar_path
    : undefined;
  const avatarUpdatedAt = typeof user?.user_metadata?.avatar_updated_at === 'string'
    ? user.user_metadata.avatar_updated_at
    : '';
  const avatarUrl = avatarPath
    ? `${supabase.storage.from('profile-avatars').getPublicUrl(avatarPath).data.publicUrl}?v=${encodeURIComponent(avatarUpdatedAt)}`
    : undefined;

  return (
    <aside className="app-header">
      <div className="nav-brand">
        <span className="brand-logo" role="img" aria-label="ระบบใบเสร็จ Receipt System" />
      </div>
      <div className="sidebar-navigation">
        <span className="sidebar-caption">เมนูหลัก</span>
        <MainNavLinks />
      </div>
      <div className="account-area">
        <ProfileAvatar initial={initial} avatarUrl={avatarUrl} />
        <div className="account-copy" title={user?.email ?? displayName}>
          <span className="account-caption">บัญชีที่ใช้งาน</span>
          <strong>{displayName}</strong>
          {user?.email && displayName !== user.email && <span className="account-email">{user.email}</span>}
        </div>
        <LogoutButton />
      </div>
      <div className="sidebar-footnote">ระบบงานภายใน · ใบเสร็จและสต็อก</div>
    </aside>
  );
}
