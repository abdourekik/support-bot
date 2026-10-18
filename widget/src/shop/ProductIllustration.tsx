import type { Illustration } from './products';

interface Props {
  kind: Illustration;
  colors: [string, string];
}

/** Simple hand-made SVG drawings, so the demo needs no product photos. */
export function ProductIllustration({ kind, colors: [light, dark] }: Props) {
  return (
    <svg viewBox="0 0 200 150" role="img" aria-hidden="true" className="product__art">
      <rect width="200" height="150" fill="#f7f2eb" />
      {kind === 'bedding' && (
        <g>
          <rect x="30" y="92" width="140" height="22" rx="5" fill={dark} />
          <rect x="34" y="72" width="132" height="22" rx="5" fill={light} stroke={dark} strokeWidth="1.5" />
          <rect x="38" y="52" width="124" height="22" rx="5" fill="#fff" stroke={dark} strokeWidth="1.5" />
          <path d="M38 63h124" stroke={dark} strokeWidth="1" strokeDasharray="3 4" />
          <rect x="84" y="46" width="32" height="74" fill={dark} opacity="0.35" />
        </g>
      )}
      {kind === 'fitted-sheet' && (
        <g>
          <path d="M40 60h120l14 24-14 24H40l-14-24z" fill={light} stroke={dark} strokeWidth="2" />
          <path d="M40 60l-14 24 14 24M160 60l14 24-14 24" fill="none" stroke={dark} strokeWidth="2" />
          <path d="M52 76c20 6 76 6 96 0M52 92c20 6 76 6 96 0" fill="none" stroke={dark} strokeWidth="1.2" opacity="0.6" />
        </g>
      )}
      {kind === 'pillowcase' && (
        <g>
          <rect x="34" y="58" width="96" height="62" rx="16" fill={light} stroke={dark} strokeWidth="2" />
          <rect x="70" y="38" width="96" height="62" rx="16" fill="#fff" stroke={dark} strokeWidth="2" />
          <path d="M146 38v62" stroke={dark} strokeWidth="1.5" strokeDasharray="4 4" />
        </g>
      )}
      {kind === 'towel' && (
        <g>
          <rect x="62" y="30" width="76" height="96" rx="6" fill={light} stroke={dark} strokeWidth="2" />
          <rect x="62" y="98" width="76" height="10" fill={dark} />
          <path d="M70 40v52M80 40v52M90 40v52M100 40v52M110 40v52M120 40v52M130 40v52" stroke={dark} strokeWidth="1" opacity="0.25" />
        </g>
      )}
      {kind === 'bath-sheet' && (
        <g>
          <ellipse cx="62" cy="96" rx="26" ry="26" fill={light} stroke={dark} strokeWidth="2" />
          <ellipse cx="62" cy="96" rx="12" ry="12" fill="none" stroke={dark} strokeWidth="1.5" />
          <rect x="62" y="70" width="88" height="52" fill={light} stroke={dark} strokeWidth="2" />
          <rect x="62" y="70" width="88" height="52" fill="none" />
          <path d="M136 70v52" stroke={dark} strokeWidth="6" opacity="0.5" />
          <ellipse cx="150" cy="96" rx="10" ry="26" fill={dark} opacity="0.4" />
        </g>
      )}
      {kind === 'cushion' && (
        <g>
          <path
            d="M52 40c32 8 64 8 96 0 8 22 8 48 0 70-32-8-64-8-96 0-8-22-8-48 0-70z"
            fill={light}
            stroke={dark}
            strokeWidth="2"
          />
          <circle cx="100" cy="75" r="4" fill={dark} />
          <path d="M60 52c26 20 54 20 80 0M60 98c26-20 54-20 80 0" fill="none" stroke={dark} strokeWidth="1" opacity="0.4" />
        </g>
      )}
    </svg>
  );
}
