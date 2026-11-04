// Демо-акаунти з seed: їхні паролі публічні (README, звіти), тому на живому сайті
// їх не можна видалити або «забрати» зміною Email — інакше демо на захисті зламається.
export const DEMO_EMAILS = new Set(['admin@gamevault.dev', 'player@gamevault.dev', 'demo@gamevault.dev']);

export const isDemoAccount = (email) => DEMO_EMAILS.has(String(email).toLowerCase());
