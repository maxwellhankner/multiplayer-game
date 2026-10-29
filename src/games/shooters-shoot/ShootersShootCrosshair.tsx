export default function ShootersShootCrosshair() {
  return (
    <div className="shooters-shoot-crosshair" aria-hidden>
      <span className="shooters-shoot-crosshair-tick shooters-shoot-crosshair-tick--n" />
      <span className="shooters-shoot-crosshair-tick shooters-shoot-crosshair-tick--e" />
      <span className="shooters-shoot-crosshair-tick shooters-shoot-crosshair-tick--s" />
      <span className="shooters-shoot-crosshair-tick shooters-shoot-crosshair-tick--w" />
      <span className="shooters-shoot-crosshair-dot" />
    </div>
  );
}
