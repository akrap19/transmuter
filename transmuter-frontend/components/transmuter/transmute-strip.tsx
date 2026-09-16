export function TransmuteStrip() {
  const coins = Array.from({ length: 8 }, (_, i) => (
    <div key={i} className="coin" />
  ));

  const track = (
    <div className="tm-track">
      {Array.from({ length: 4 }, (_, cellIndex) => (
        <div key={cellIndex} className="tm-cell">
          {coins}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="transmute" aria-hidden="true">
        <div className="tm-layer">{track}</div>
        <div className="tm-layer goldside">{track}</div>
        <div className="tm-gate" />
      </div>
      <div className="tm-caption" aria-hidden="true">
        The Transmuter
      </div>
    </>
  );
}
