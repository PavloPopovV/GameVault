import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { EmptyState } from './components/States.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import GamePage from './pages/GamePage.jsx';
import LibraryPage from './pages/LibraryPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

const guard = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="games/:slug" element={<GamePage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="library" element={guard(<LibraryPage />)} />
        <Route path="wishlist" element={guard(<WishlistPage />)} />
        <Route path="profile" element={guard(<ProfilePage />)} />
        <Route path="dashboard" element={guard(<LibraryPage />)} />
        <Route path="*" element={<EmptyState title="Сторінку не знайдено" action={<Link to="/" className="btn btn--primary">На головну</Link>} />} />
      </Route>
    </Routes>
  );
}
