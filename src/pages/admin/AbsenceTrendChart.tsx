import type { AbsenceTrendPoint } from '../../api';

const WIDTH = 720;
const HEIGHT = 200;
const PADDING_LEFT = 28;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 22;

function shortLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/**
 * Barres groupées (absents / retards), un SVG dessiné à la main plutôt qu'une
 * dépendance de graphique : la maquette n'en utilise aucune, et une simple
 * série sur 14-60 points ne justifie pas d'en ajouter une pour Gesnotes.
 */
export function AbsenceTrendChart({ data }: { data: AbsenceTrendPoint[] }) {
  const plotWidth = WIDTH - PADDING_LEFT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const maxValue = Math.max(1, ...data.map((point) => Math.max(point.absents, point.retards)));
  const groupWidth = plotWidth / Math.max(1, data.length);
  const barWidth = Math.min(14, groupWidth * 0.32);
  const baseY = PADDING_TOP + plotHeight;

  const yTicks = Array.from(new Set([0, Math.ceil(maxValue / 2), maxValue]));
  // Un jour sur N pour garder des étiquettes lisibles sur 60 jours.
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Évolution des absences et retards">
        {yTicks.map((tick) => {
          const y = PADDING_TOP + plotHeight - (tick / maxValue) * plotHeight;
          return (
            <g key={tick}>
              <line x1={PADDING_LEFT} y1={y} x2={WIDTH} y2={y} stroke="#f1f5f9" />
              <text x={0} y={y + 3} fontSize={9} fill="#9ca3af">{tick}</text>
            </g>
          );
        })}

        {data.map((point, index) => {
          const x = PADDING_LEFT + index * groupWidth + groupWidth / 2;
          const absentsHeight = (point.absents / maxValue) * plotHeight;
          const retardsHeight = (point.retards / maxValue) * plotHeight;
          const showLabel = index % labelEvery === 0;

          return (
            <g key={point.date}>
              <rect x={x - barWidth - 1} y={baseY - absentsHeight} width={barWidth} height={absentsHeight} rx={2} fill="#f87171" />
              <rect x={x + 1} y={baseY - retardsHeight} width={barWidth} height={retardsHeight} rx={2} fill="#fbbf24" />
              {showLabel ? (
                <text x={x} y={HEIGHT - 6} fontSize={9} textAnchor="middle" fill="#9ca3af">
                  {shortLabel(point.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" aria-hidden="true" /> Absences
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" aria-hidden="true" /> Retards
        </span>
      </div>
    </div>
  );
}
