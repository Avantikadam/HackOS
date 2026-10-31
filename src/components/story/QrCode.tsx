import { useMemo } from "react";

/**
 * Deterministic QR-style pattern for the pass preview. It is a decorative
 * representation of a scan code, not a scannable code.
 */
export function QrCode({
  value,
  size = 132,
  className,
  label,
}: {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}) {
  const modules = 21;

  const grid = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < value.length; i += 1) {
      seed = (seed * 31 + value.charCodeAt(i)) % 2147483647;
    }
    const rand = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };

    const cells: boolean[][] = Array.from({ length: modules }, () =>
      Array.from({ length: modules }, () => false),
    );

    const inFinder = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= modules - 7) || (r >= modules - 7 && c < 7);

    for (let r = 0; r < modules; r += 1) {
      for (let c = 0; c < modules; c += 1) {
        if (inFinder(r, c)) continue;
        cells[r][c] = rand() > 0.52;
      }
    }

    const finder = (row: number, col: number) => {
      for (let r = 0; r < 7; r += 1) {
        for (let c = 0; c < 7; c += 1) {
          const edge = r === 0 || r === 6 || c === 0 || c === 6;
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          cells[row + r][col + c] = edge || core;
        }
      }
    };
    finder(0, 0);
    finder(0, modules - 7);
    finder(modules - 7, 0);

    // timing patterns
    for (let i = 8; i < modules - 8; i += 1) {
      cells[6][i] = i % 2 === 0;
      cells[i][6] = i % 2 === 0;
    }

    // alignment
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        const edge = r === 0 || r === 4 || c === 0 || c === 4;
        const core = r === 2 && c === 2;
        cells[modules - 9 + r][modules - 9 + c] = edge || core;
      }
    }

    return cells;
  }, [value]);

  const unit = size / modules;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label ?? "Scan code preview"}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} rx="10" fill="#ffffff" />
      {grid.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * unit}
              y={r * unit}
              width={unit}
              height={unit}
              fill="#131c31"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
