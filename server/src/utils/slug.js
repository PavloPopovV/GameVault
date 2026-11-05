export function slugify(title) {
  return String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9а-яіїєґ]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}
