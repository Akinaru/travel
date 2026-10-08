const COLORS = ["bg-accent", "bg-warm", "bg-ink", "bg-[#5b4b8a]"];

export function Avatars({ people, size = 30 }: { people: { userId: string; name: string }[]; size?: number }) {
  return (
    <div className="flex" aria-label={people.map((p) => p.name).join(", ")}>
      {people.slice(0, 4).map((p, i) => (
        <span
          key={p.userId}
          title={p.name}
          style={{ width: size, height: size, marginLeft: i ? -8 : 0 }}
          className={`flex items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white ${COLORS[i % COLORS.length]}`}
        >
          {p.name.trim().charAt(0).toUpperCase()}
        </span>
      ))}
    </div>
  );
}
