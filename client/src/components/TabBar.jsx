import { NavLink } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import NavCounter from './NavCounter.jsx';

// Іконки 24×24, лінія 2px — у стилі решти інтерфейсу (лупа в пошуку, кошик на картках)
const Icon = ({ children }) => (
  <svg className="tabbar__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONS = {
  catalog: <Icon><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Icon>,
  library: <Icon><path d="M6 11h12" /><path d="M7.5 15h.01M10 15h.01" /><path d="M16 14v2M15 15h2" /><rect x="2" y="7" width="20" height="12" rx="5" /></Icon>,
  wishlist: <Icon><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></Icon>,
  admin: <Icon><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></Icon>,
  login: <Icon><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></Icon>,
};

/**
 * Нижня панель вкладок на телефонах і планшетах (≤ 900 px) — як в мобільних застосунках:
 * основні розділи під великим пальцем, без бургер-меню. На десктопі прихована, там навігація в шапці.
 */
export default function TabBar({ user, isAuthenticated }) {
  const tab = (to, icon, label, extra = null, end = false) => (
    <NavLink to={to} end={end} className="tabbar__item">
      <span className="tabbar__glyph">{icon}{extra}</span>
      <span className="tabbar__label">{label}</span>
    </NavLink>
  );

  return (
    <nav className="tabbar" aria-label="Основні розділи">
      {tab('/', ICONS.catalog, 'Каталог', null, true)}
      {isAuthenticated ? (
        <>
          {tab('/library', ICONS.library, 'Бібліотека', <NavCounter value={user.stats?.totalGames} />)}
          {tab('/wishlist', ICONS.wishlist, 'Wishlist', <NavCounter value={user.stats?.wishlistCount} />)}
          {user.role === 'ADMIN' && tab('/admin/games', ICONS.admin, 'Адмінка')}
          {tab('/profile', <Avatar name={user.username} avatarUrl={user.avatarUrl} size="sm" />, 'Профіль')}
        </>
      ) : (
        tab('/login', ICONS.login, 'Увійти')
      )}
    </nav>
  );
}
