// Extension point for spec 5.7 (Claude-powered plain-English entry / Q&A),
// deferred to a later phase. Inert for now — positioned where the real
// floating chat bubble will live once that phase starts.
export function ClaudeFabPlaceholder() {
  return (
    <button
      type="button"
      disabled
      aria-label="Claude assistant (coming soon)"
      title="Claude assistant — coming soon"
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 cursor-not-allowed items-center justify-center rounded-full bg-zinc-300 text-white shadow-lg md:bottom-6"
    >
      <span aria-hidden className="text-lg">
        ✦
      </span>
    </button>
  );
}
