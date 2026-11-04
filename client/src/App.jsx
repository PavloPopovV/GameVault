import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { EmptyState } from './components/States.jsx';
import AuthPage from './pages/AuthPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

function Dashboard() {
  const { user } = useAuth();
  return <EmptyState title={`Вітаємо, ${user.username}!`} text={`Ви увійшли як ${user.email}`} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<EmptyState title="Каталог у розробці" action={<Link to="/dashboard" className="btn btn--primary">Мій кабінет</Link>} />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<EmptyState title="Сторінку не знайдено" action={<Link to="/" className="btn btn--primary">На головну</Link>} />} />
      </Route>
    </Routes>
  );
}
