import { useState } from 'react';
import { assetUrl } from '../api/client.js';

/** Фото профілю або перша літера ніка, якщо фото немає чи воно не завантажилось. */
export default function Avatar({ name, avatarUrl, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const cls = `avatar ${size === 'lg' ? 'avatar--lg' : ''} ${size === 'sm' ? 'avatar--sm' : ''}`;
  if (avatarUrl && !failed) {
    return <img className={`${cls} avatar--img`} src={assetUrl(avatarUrl)} alt="" aria-hidden="true" onError={() => setFailed(true)} />;
  }
  return <span className={cls} aria-hidden="true">{name?.[0]?.toUpperCase()}</span>;
}
