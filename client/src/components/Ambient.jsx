/**
 * Кольоровий «відблиск» обкладинки під склом: розмита копія картинки на фоні картки.
 * Обгортка обрізає розмиття по заокругленню картки, але не саму картку (випадаючі списки не ховаються).
 */
export default function Ambient({ image }) {
  if (!image) return null;
  return (
    <span className="ambient" aria-hidden="true">
      <span className="ambient__img" style={{ backgroundImage: `url("${image}")` }} />
    </span>
  );
}
