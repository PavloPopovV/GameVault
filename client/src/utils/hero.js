/** Широкий арт гри зі Steam (library_hero) замість вертикальної обкладинки; для інших адрес — сама обкладинка. */
export const heroUrl = (coverUrl) =>
  coverUrl?.includes('steamstatic.com') ? coverUrl.replace('library_600x900.jpg', 'library_hero.jpg') : coverUrl ?? null;
