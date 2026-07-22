export function UserAvatar({ username, avatarUrl, size = "md" }: { username: string; avatarUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "size-9 text-sm" : size === "lg" ? "size-20 text-2xl" : "size-12 text-lg";
  if (avatarUrl) return <span className={`${sizeClass} block shrink-0 overflow-hidden rounded-full bg-brand-100`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="size-full object-cover" src={avatarUrl} alt={`${username}的头像`} referrerPolicy="no-referrer" />
  </span>;
  return <span className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white`} aria-label={`${username}的默认头像`}>{username.slice(0, 1)}</span>;
}
