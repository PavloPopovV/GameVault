import { useEffect, useState } from 'react';
import NavCounter from './NavCounter.jsx';
import TabBar from './TabBar.jsx';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import LiquidGlassFilter from './LiquidGlassFilter.jsx';

export default function Layout() {
  const { user, isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // на сторінках входу й реєстрації пошук у шапці не потрібен
  const showSearch = !['/login', '/register'].includes(pathname);

  useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);

  const onSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim().length >= 2) next.set('q', q.trim());
    navigate(`/?${next}`);
  };


  return (
    <div className="app">
      <LiquidGlassFilter />
      <header className="header liquid">
        <div className="container header__inner">
          <Link to="/" className="logo" aria-label="GameVault — на головну">
            <img src="/favicon.svg" alt="" width="32" height="32" />
            <span className="brand-name">GameVault</span>
          </Link>

          {showSearch && (
            <form className="search" onSubmit={onSearch} role="search">
              <input
                type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Пошук гри…" aria-label="Пошук гри" className="search__input"
              />
            </form>
          )}


          <nav className="nav" aria-label="Основна навігація">
            <NavLink to="/" end className="nav__link">Каталог</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/library" className="nav__link">Моя бібліотека<NavCounter value={user.stats?.totalGames} /></NavLink>
                <NavLink to="/wishlist" className="nav__link">Wishlist<NavCounter value={user.stats?.wishlistCount} /></NavLink>
                {user.role === 'ADMIN' && <NavLink to="/admin/games" className="nav__link">Адмінка</NavLink>}
              </>
            )}
            {isAuthenticated ? (
              <NavLink to="/profile" className="nav__link nav__profile" aria-label={`Профіль ${user.username}`} title="Мій профіль">
                <Avatar name={user.username} avatarUrl={user.avatarUrl} />
                <span className="nav__profile-label" aria-hidden="true">Мій профіль</span>
              </NavLink>
            ) : (
              <Link to="/login" className="btn btn--primary btn--sm">Увійти</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="main container">
        <Outlet />
      </main>

      <TabBar user={user} isAuthenticated={isAuthenticated} />

      <footer className="footer">
        <div className="container">GameVault · Проєктний практикум, 2026</div>
      </footer>
    </div>
  );
}
