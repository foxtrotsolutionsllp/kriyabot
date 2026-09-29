const avatarPresets: Record<string, string> = {
  violet: "linear-gradient(145deg,#f1d9ff,#9162df)",
  orange: "linear-gradient(145deg,#ffe2b5,#f28a42)",
  blue: "linear-gradient(145deg,#d6efff,#548ed9)",
  green: "linear-gradient(145deg,#d9f6e8,#45ac83)",
  rose: "linear-gradient(145deg,#ffe0ec,#df6e9b)",
  teal: "linear-gradient(145deg,#d5f8f1,#36a99e)",
};

export function ProfileAvatar({ value, name, className = "", title }: { value?: string | null; name?: string; className?: string; title?: string }) {
  const initials = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "KB";
  const preset = value?.startsWith("preset:") ? value.slice(7) : "";
  const background = avatarPresets[preset] ?? "linear-gradient(145deg,#ffe2ca,#c3b8ff)";
  if (value?.startsWith("data:image/")) return <img className={`profile-avatar-view ${className}`} src={value} alt={title ?? `${name ?? "User"} profile picture`} />;
  return <span className={`profile-avatar-view ${className}`} style={{ background }} aria-label={title ?? `${name ?? "User"} avatar`}>{initials}</span>;
}
