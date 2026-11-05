import { useState } from 'react';

/**
 * Фоновий арт сторінки (як фон профілю в Steam): закріплений під контентом,
 * щоб скляні панелі «заломлювали» його при прокрутці.
 * fallback — запасна картинка, якщо image не завантажилась (напр. у гри в Steam немає широкого арту).
 * variant="hero" — арт лише вгорі сторінки (видно нижню частину кадру з героєм),
 * далі плавно переходить у чорне, як обкладинка на картках; контент стоїть на темному.
 */
export default function PageBackdrop({ image, fallback, variant }) {
  const [failed, setFailed] = useState([]);
  // спершу широкий арт, якщо він не вантажиться — запасна картинка (обкладинка), інакше фону немає
  const src = [image, fallback].find((u) => u && !failed.includes(u));
  if (!src) return null;
  return (
    <div className={`backdrop ${variant ? `backdrop--${variant}` : ''}`} aria-hidden="true">
      <img key={src} src={src} alt="" onError={() => setFailed((f) => [...f, src])} />
    </div>
  );
}
