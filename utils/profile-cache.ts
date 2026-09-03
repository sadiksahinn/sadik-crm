export type ProfilePreview = {
  fullName: string;
  avatarUrl: string;
  companyName: string;
  profession: string;
};

const cacheKey = (userId: string) => `valkea:profile-preview:${userId}`;

export function readProfilePreview(userId: string): ProfilePreview | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const value = window.localStorage.getItem(cacheKey(userId));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<ProfilePreview>;
    return {
      fullName: String(parsed.fullName || ""),
      avatarUrl: String(parsed.avatarUrl || ""),
      companyName: String(parsed.companyName || ""),
      profession: String(parsed.profession || ""),
    };
  } catch {
    return null;
  }
}

export function writeProfilePreview(userId: string, profile: ProfilePreview) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(cacheKey(userId), JSON.stringify(profile));
  } catch {
    // Önbellek kullanılamasa da profil akışı çalışmaya devam eder.
  }
}

export function clearProfilePreview(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(cacheKey(userId));
  } catch {
    // Çıkış akışını önbellek hatası yüzünden engelleme.
  }
}
