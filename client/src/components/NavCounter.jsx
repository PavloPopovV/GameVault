// Бейдж-лічильник як у кошика магазину: лише коли є хоча б одна гра.
// key={value} перезапускає анімацію «підстрибування» при кожній зміні числа.
export default function NavCounter({ value }) {
  if (!value) return null;
  return (
    <span key={value} className="nav__count">
      {value > 99 ? '99+' : value}
      <span className="sr-only"> ігор</span>
    </span>
  );
}
