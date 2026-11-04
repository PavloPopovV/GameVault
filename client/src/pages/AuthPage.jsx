import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { validateAuthForm } from '../utils/validation.js';

export default function AuthPage({ mode }) {
  const { login, register, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === 'register';

  if (isAuthenticated) return <Navigate to={location.state?.from || '/'} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validateAuthForm(mode, form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({ username: form.username, email: form.email, password: form.password });
        toast.success('Акаунт створено. Ласкаво просимо до GameVault!');
      } else {
        await login({ email: form.email, password: form.password });
        toast.success('Ви увійшли в систему');
      }
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      toast.error(err.message);
      // Бекенд повертає поле, до якого належить помилка: details: [{ field, message }]
      if (err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name, label, type, placeholder, autoComplete) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className={`input ${errors[name] ? 'input--error' : ''}`} type={type} value={form[name]} onChange={set(name)}
        placeholder={placeholder} autoComplete={autoComplete} aria-invalid={Boolean(errors[name])}
      />
      {errors[name] && <span className="field__error">{errors[name]}</span>}
    </label>
  );

  return (
    <div className="auth">
      <div className="auth__card card">
        <div className="auth__brand">
          <img src="/favicon.svg" alt="" width="40" height="40" />
          <h1>GameVault</h1>
        </div>
        <p className="auth__lead">Усі твої ігри — в одній бібліотеці.</p>
        <div className="tabs" role="tablist">
          <Link to="/login" replace state={location.state} role="tab" aria-selected={!isRegister} className={`tabs__tab ${!isRegister ? 'tabs__tab--active' : ''}`}>Вхід</Link>
          <Link to="/register" replace state={location.state} role="tab" aria-selected={isRegister} className={`tabs__tab ${isRegister ? 'tabs__tab--active' : ''}`}>Реєстрація</Link>
        </div>
        <form className="form" onSubmit={onSubmit} noValidate>
          {isRegister && field('username', 'Нікнейм', 'text', 'geralt_of_rivia', 'username')}
          {field('email', 'Email', 'email', 'you@example.com', 'email')}
          {field('password', 'Пароль', 'password', isRegister ? 'Мінімум 8 символів' : '••••••••', isRegister ? 'new-password' : 'current-password')}
          {isRegister && field('confirm', 'Підтвердження пароля', 'password', 'Повторіть пароль', 'new-password')}
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Зачекайте…' : isRegister ? 'Створити акаунт' : 'Увійти'}
          </button>
        </form>
        <p className="auth__switch">
          {isRegister ? <>Вже є акаунт? <Link to="/login" replace>Увійти</Link></> : <>Немає акаунта? <Link to="/register" replace>Зареєструватися</Link></>}
        </p>
      </div>
    </div>
  );
}
