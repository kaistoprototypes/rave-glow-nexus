export function AnimatedBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 animated-grid opacity-60" />
      <div className="absolute -top-32 -left-20 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle_at_center,#39FF14,transparent_60%)] opacity-30 animate-float" />
      <div className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,#FF00C8,transparent_60%)] opacity-25 animate-pulse-glow" />
      <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle_at_center,#00E5FF,transparent_60%)] opacity-25 animate-float" style={{ animationDelay: "-6s" }} />
      <div className="absolute inset-0 scan-lines opacity-40" />
    </div>
  );
}
