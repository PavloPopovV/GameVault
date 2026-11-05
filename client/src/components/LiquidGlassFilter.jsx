// SVG-фільтр «рідкого скла» (як Liquid Glass в iOS): біля країв панелі фон заломлюється,
// у центрі лишається чистим. Мапа зміщення — два градієнти (R — по горизонталі, G — по вертикалі):
// 0.5 = без зміщення, ближче до краю — сильніше «тягне» зображення всередину, як лінза.
// Працює як backdrop-filter: url(#liquid-glass) — лише в Chromium; в інших браузерах лишається звичайне розмиття.
const svg = (gradient) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' preserveAspectRatio='none'><defs>${gradient}</defs><rect width='100' height='100' fill='url(#g)'/></svg>`,
)}`;
const stops = (c) => `<stop offset='0' stop-color='${c(255)}'/><stop offset='0.18' stop-color='${c(128)}'/><stop offset='0.82' stop-color='${c(128)}'/><stop offset='1' stop-color='${c(0)}'/>`;
const MAP_X = svg(`<linearGradient id='g' x1='0' y1='0' x2='1' y2='0'>${stops((v) => `rgb(${v},0,0)`)}</linearGradient>`);
const MAP_Y = svg(`<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>${stops((v) => `rgb(0,${v},0)`)}</linearGradient>`);

export default function LiquidGlassFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <filter id="liquid-glass" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox"
        primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
        <feImage href={MAP_X} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="mx" />
        <feImage href={MAP_Y} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="my" />
        <feComposite in="mx" in2="my" operator="arithmetic" k2="1" k3="1" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="0.05" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
