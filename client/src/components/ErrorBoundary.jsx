import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="state state--error fatal">
          <div className="state__icon" aria-hidden="true">💥</div>
          <h1 className="state__title">Щось пішло не так</h1>
          <p className="state__text">Сталася непередбачена помилка інтерфейсу. Оновіть сторінку.</p>
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>Оновити</button>
        </div>
      );
    }
    return this.props.children;
  }
}
