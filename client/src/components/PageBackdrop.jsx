import { useState } from 'react';

/**
 * Фоновий арт сторінки (як фон профілю в Steam): закріплений під контентом,
 * щоб скляні панелі «заломлювали» його при прокрутці.
 */
export default function PageBackdrop({ image }) {
  const [failed, setFailed] = useState(null);
  if (!image || failed === image) return null;
  return (
    <div className="backdrop" aria-hidden="true">
      <img src={image} alt="" onError={() => setFailed(image)} />
    </div>
  );
}
