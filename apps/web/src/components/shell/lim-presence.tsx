export function LimPresence({ size = 'large' }: { size?: 'small' | 'large' }) {
  return <div className="lim-presence" data-size={size} aria-hidden="true">
    <span className="lim-orbit" /><span className="lim-core" />
  </div>;
}
