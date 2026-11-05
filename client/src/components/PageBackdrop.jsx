import { useState } from 'react';

/**
 * Фоновий арт сторінки (як фон профілю в Steam): закріплений під контентом,
 * щоб скляні панелі «заломлювали» його при прокрутці.
 * variant="hero" — арт лише вгорі сторінки (видно нижню частину кадру з героєм),
 * далі плавно переходить у чорне, як обкладинка на картках; контент стоїть на темному.
 */
export default function PageBackdrop({ image, variant }) {
  const [failed, setFailed] = useState(null);
  if (!image || failed === image) return null;
  return (
    <div className={`backdrop ${variant ? `backdrop--${variant}` : ''}`} aria-hidden="true">
      <img src={image} alt="" onError={() => setFailed(image)} />
    </div>
  );
}
