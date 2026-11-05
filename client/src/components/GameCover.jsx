import { useState } from 'react';

// Стабільний хеш назви — щоб заглушка гри завжди мала той самий колір
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Placeholder({ title, size, decorative }) {
  const h = hash(title);
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h % 80)) % 360;
  const initials = title
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className={`cover cover--${size} cover--generated`}
      style={{ background: `linear-gradient(135deg, hsl(${hue1} 65% 42%), hsl(${hue2} 70% 22%))` }}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `Обкладинка ${title}` })}
    >
      <span className="cover__initials">{initials}</span>
    </div>
  );
}

/**
 * Обкладинка гри: реальне фото, а якщо його немає або воно не завантажилось — кольорова заглушка.
 * decorative=true (за замовчуванням) — у картках і списках, де назва вже є текстом поруч:
 * порожній alt, щоб скрінрідер не озвучував назву двічі.
 */
export default function GameCover({ title, coverUrl, size = 'md', decorative = true }) {
  const [failedUrl, setFailedUrl] = useState(null);
  if (!coverUrl || failedUrl === coverUrl) return <Placeholder title={title} size={size} decorative={decorative} />;
  return (
    <img
      className={`cover cover--${size}`}
      src={coverUrl}
      alt={decorative ? '' : `Обкладинка ${title}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(coverUrl)}
    />
  );
}
