const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const BASE = `${API_ORIGIN}/api/v1`;

/** Шлях з API (напр., фото профілю) → повна адреса з урахуванням домену бекенду. */
export const assetUrl = (path) => (path ? `${API_ORIGIN}${path}` : null);
const TOKEN_KEY = 'gv_token';

export const tokenStorage = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* приватний режим */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* приватний режим */ }
  },
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// Викликається після успішної зміни бібліотеки, Wishlist або рецензій — щоб оновити лічильники і статистику
let onCollectionChange = () => {};
export const setCollectionChangeHandler = (fn) => { onCollectionChange = fn; };
const COLLECTION_PATH = /^\/(library|wishlist|reviews)(\/|$)|^\/games\/[^/]+\/reviews$/;

export async function request(path, { method = 'GET', body, query, auth = true } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStorage.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Немає з\'єднання з сервером. Перевірте інтернет і спробуйте ще раз.');
  }

  const changed = res.ok && method !== 'GET' && COLLECTION_PATH.test(path);
  if (changed) onCollectionChange();
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data?.message || `Помилка сервера (${res.status})`, data?.details);
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body, auth: false }),
  login: (body) => request('/auth/login', { method: 'POST', body, auth: false }),
  me: () => request('/users/me'),
  updateMe: (body) => request('/users/me', { method: 'PATCH', body }),
  myReviews: () => request('/users/me/reviews'),
  uploadAvatar: (image) => request('/users/me/avatar', { method: 'PUT', body: { image } }),
  removeAvatar: () => request('/users/me/avatar', { method: 'DELETE' }),
  deleteMe: (password) => request('/users/me', { method: 'DELETE', body: { password } }),

  genres: () => request('/genres'),
  platforms: () => request('/platforms'),
  games: (query) => request('/games', { query }),
  game: (idOrSlug) => request(`/games/${encodeURIComponent(idOrSlug)}`),

  library: (status) => request('/library', { query: { status } }),
  addToLibrary: (gameId, status) => request('/library', { method: 'POST', body: { gameId, status } }),
  setStatus: (gameId, status) => request(`/library/${gameId}`, { method: 'PATCH', body: { status } }),
  removeFromLibrary: (gameId) => request(`/library/${gameId}`, { method: 'DELETE' }),

  wishlist: () => request('/wishlist'),
  addToWishlist: (gameId) => request('/wishlist', { method: 'POST', body: { gameId } }),
  removeFromWishlist: (gameId) => request(`/wishlist/${gameId}`, { method: 'DELETE' }),
  moveToLibrary: (gameId) => request(`/wishlist/${gameId}/move-to-library`, { method: 'POST' }),

  reviews: (gameId) => request(`/games/${gameId}/reviews`),
  createReview: (gameId, body) => request(`/games/${gameId}/reviews`, { method: 'POST', body }),
  updateReview: (id, body) => request(`/reviews/${id}`, { method: 'PATCH', body }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),
  voteReview: (id, value) => request(`/reviews/${id}/vote`, { method: 'PUT', body: { value } }),
};
