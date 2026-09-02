export function ScoreRing({ score }: { score: number }) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="score-ring" aria-label={`Proof score ${score} out of 100`}>
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <circle className="score-track" cx="90" cy="90" r={radius} />
        <circle
          className="score-value"
          cx="90"
          cy="90"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div><strong>{score}</strong><span>/100</span></div>
    </div>
  );
}
