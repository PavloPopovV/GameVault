import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';

// Бейдж-лічильник як у кошика магазину: лише коли є хоча б одна гра.
// key={value} перезапускає анімацію «підстрибування» при кожній зміні числа.
function Counter({ value }) {
  if (!value) return null;
  return (
    <span key={value} className="nav__count">
      {value > 99 ? '99+' : value}
      <span className="sr-only"> ігор</span>
    </span>
  );
}

export default function Layout() {
  const { user, isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);

  const onSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim().length >= 2) next.set('q', q.trim());
    navigate(`/?${next}`);
  };


  return (
    <div className="app">
      <header className="header">
        <div className="container header__inner">
          <Link to="/" className="logo" aria-label="GameVault — на головну">
            <img src="/favicon.svg" alt="" width="32" height="32" />
            <span className="brand-name">GameVault</span>
          </Link>

          <form className="search" onSubmit={onSearch} role="search">
            <input
              type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Пошук гри…" aria-label="Пошук гри" className="search__input"
            />
          </form>

          <button type="button" className="burger" aria-label="Меню" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <span /><span /><span />
          </button>

          <nav className={`nav ${menuOpen ? 'nav--open' : ''}`}>
            <NavLink to="/" end className="nav__link">Каталог</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/library" className="nav__link">Моя бібліотека<Counter value={user.stats?.totalGames} /></NavLink>
                <NavLink to="/wishlist" className="nav__link">Wishlist<Counter value={user.stats?.wishlistCount} /></NavLink>
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

      <footer className="footer">
        <div className="container">GameVault · Проєктний практикум, 2026</div>
      </footer>
    </div>
  );
}
