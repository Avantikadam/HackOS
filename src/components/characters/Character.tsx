import { useMemo } from "react";
import { cn } from "../../utils/cn";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type Look = { x: number; y: number };

export type HairStyle = "curly" | "bun" | "fade" | "long" | "ponytail" | "beanie";
export type Outfit = "hoodie" | "denim" | "sweater" | "tee" | "cardigan";
export type Pose = "laptop" | "wave" | "clipboard" | "phone" | "judge" | "qr" | "idle";
export type Mood = "smile" | "focus" | "grin";

export interface CharacterConfig {
  id: string;
  name: string;
  role: string;
  skin: string;
  skinShadow: string;
  hair: HairStyle;
  hairColor: string;
  outfit: Outfit;
  top: string;
  topShade: string;
  bottom: string;
  shoes: string;
  pose: Pose;
  mood: Mood;
  accessory?: "glasses" | "earrings" | "headphones" | "none";
  accent: string;
}

/* ------------------------------------------------------------------ */
/* Geometry — one shared skeleton so every character matches          */
/* ------------------------------------------------------------------ */

const HEAD_PATH =
  "M 80 62 C 80 46 92 36 110 36 C 128 36 140 46 140 62 C 140 81 128 100 110 100 C 92 100 80 81 80 62 Z";

const TORSO_PATH =
  "M 110 112 C 129 112 146 122 151 141 L 158 234 C 158 242 152 246 144 246 L 76 246 C 68 246 62 242 62 234 L 69 141 C 74 122 91 112 110 112 Z";

const ARM_PATHS: Record<Pose, { left: string; right: string }> = {
  laptop: {
    left: "M 82 144 C 90 164 96 182 102 206",
    right: "M 138 144 C 130 164 124 182 118 206",
  },
  wave: {
    left: "M 82 144 C 76 162 72 186 76 212",
    right: "M 138 142 C 150 124 158 108 160 92",
  },
  clipboard: {
    left: "M 82 144 C 90 158 96 176 101 202",
    right: "M 138 144 C 146 160 150 184 148 212",
  },
  phone: {
    left: "M 82 144 C 77 160 73 184 77 210",
    right: "M 138 144 C 148 158 151 176 146 204",
  },
  judge: {
    left: "M 82 144 C 90 160 95 178 99 204",
    right: "M 138 142 C 152 148 161 160 159 178",
  },
  qr: {
    left: "M 82 144 C 77 160 73 184 77 210",
    right: "M 138 144 C 148 158 151 176 146 200",
  },
  idle: {
    left: "M 82 144 C 76 162 72 186 76 212",
    right: "M 138 144 C 146 162 150 186 148 212",
  },
};

const HAND_POINTS: Record<Pose, { left: [number, number]; right: [number, number] }> = {
  laptop: { left: [102, 208], right: [118, 208] },
  wave: { left: [80, 214], right: [160, 89] },
  clipboard: { left: [101, 204], right: [148, 214] },
  phone: { left: [80, 212], right: [145, 206] },
  judge: { left: [99, 206], right: [158, 181] },
  qr: { left: [80, 212], right: [145, 202] },
  idle: { left: [80, 214], right: [148, 214] },
};

/* ------------------------------------------------------------------ */
/* Hair                                                               */
/* ------------------------------------------------------------------ */

function Hair({ config }: { config: CharacterConfig }) {
  const { hair, hairColor } = config;

  if (hair === "curly") {
    return (
      <g fill={hairColor}>
        <circle cx="110" cy="38" r="26" />
        <circle cx="87" cy="46" r="16" />
        <circle cx="133" cy="46" r="16" />
        <circle cx="97" cy="28" r="13" />
        <circle cx="123" cy="28" r="13" />
        <circle cx="81" cy="61" r="10" />
        <circle cx="139" cy="61" r="10" />
        <path
          d="M 84 50 C 90 34 130 30 136 50 C 130 40 118 36 110 38 C 100 40 90 42 84 50 Z"
          fill="#000"
          fillOpacity="0.07"
        />
      </g>
    );
  }

  if (hair === "bun") {
    return (
      <g fill={hairColor}>
        <path d="M 80 60 C 78 38 94 29 110 29 C 126 29 142 38 140 60 C 139 48 127 41 110 41 C 93 41 81 48 80 60 Z" />
        <circle cx="110" cy="20" r="12" />
        <path d="M 84 50 C 90 37 130 35 136 50 C 130 41 118 38 110 40 C 100 42 90 44 84 50 Z" fill="#000" fillOpacity="0.07" />
      </g>
    );
  }

  if (hair === "fade") {
    return (
      <g fill={hairColor}>
        <path d="M 82 57 C 84 36 95 29 110 29 C 125 29 136 36 138 57 C 134 46 125 41 110 41 C 95 41 86 46 82 57 Z" />
        <path d="M 85 51 C 90 40 130 39 135 51 C 129 44 118 42 110 44 C 100 46 91 46 85 51 Z" fill="#000" fillOpacity="0.08" />
      </g>
    );
  }

  if (hair === "long") {
    return (
      <g fill={hairColor}>
        <path d="M 78 63 C 73 32 92 23 110 23 C 128 23 147 32 142 63 L 148 130 C 149 137 140 138 138 130 L 136 78 C 134 47 123 40 110 40 C 97 40 86 47 84 78 L 82 130 C 80 138 71 137 72 130 Z" />
        <path d="M 84 50 C 90 34 130 32 136 50 C 130 40 118 36 110 38 C 100 40 90 42 84 50 Z" fill="#000" fillOpacity="0.07" />
      </g>
    );
  }

  if (hair === "ponytail") {
    return (
      <g fill={hairColor}>
        <path d="M 81 58 C 80 36 94 28 110 28 C 126 28 140 36 139 58 C 138 46 126 40 110 40 C 94 40 82 46 81 58 Z" />
        <path d="M 139 50 C 155 60 161 90 152 114 C 148 125 136 122 139 111 C 146 90 141 68 130 58 Z" />
        <path d="M 84 50 C 90 37 130 35 136 50 C 130 41 118 38 110 40 C 100 42 90 44 84 50 Z" fill="#000" fillOpacity="0.08" />
      </g>
    );
  }

  // beanie
  return (
    <g>
      <path d="M 82 55 C 84 31 95 24 110 24 C 125 24 136 31 138 55 Z" fill={hairColor} />
      <path d="M 79 52 H 141 V 63 C 141 66 138 68 135 68 H 85 C 82 68 79 66 79 63 Z" fill={config.topShade} />
      <path d="M 85 47 C 92 37 128 36 135 47" stroke="#000" strokeOpacity="0.08" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Face                                                               */
/* ------------------------------------------------------------------ */

function Face({ config, look }: { config: CharacterConfig; look: Look }) {
  const px = look.x * 2.2;
  const py = look.y * 1.6;

  return (
    <g>
      {/* ears */}
      <ellipse cx="79.5" cy="70" rx="5.2" ry="7.6" fill={config.skinShadow} />
      <ellipse cx="140.5" cy="70" rx="5.2" ry="7.6" fill={config.skinShadow} />

      {/* blush */}
      <ellipse cx="89" cy="82" rx="5.4" ry="3.1" fill="#e2603f" opacity="0.16" />
      <ellipse cx="131" cy="82" rx="5.4" ry="3.1" fill="#e2603f" opacity="0.16" />

      {/* brows */}
      <path d="M 90 57 Q 97 51.5 104 56" stroke={config.hairColor} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M 116 56 Q 123 51.5 130 57" stroke={config.hairColor} strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* eyes */}
      {[
        { cx: 97, cy: 70, cls: "" },
        { cx: 123, cy: 70, cls: "char-eye-2" },
      ].map((eye) => (
        <g key={eye.cx} className={cn("char-eye", eye.cls)}>
          <ellipse cx={eye.cx} cy={eye.cy} rx="5.6" ry="6.2" fill="#fff" />
          <circle cx={eye.cx + px} cy={eye.cy + py} r="2.8" fill="#1a2136" />
          <circle cx={eye.cx + px - 1} cy={eye.cy + py - 1.2} r="1" fill="#fff" />
        </g>
      ))}

      {/* lash lines */}
      <path d="M 91 64.5 Q 97 60.5 103 64.5" stroke="#1a2136" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M 117 64.5 Q 123 60.5 129 64.5" stroke="#1a2136" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />

      {/* nose */}
      <path d="M 110 77 Q 113 83 108 84.5" stroke={config.skinShadow} strokeWidth="1.7" fill="none" strokeLinecap="round" />

      {/* mouth */}
      {config.mood === "smile" && (
        <path d="M 103 88 Q 110 94 117 88" stroke="#1a2136" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      )}
      {config.mood === "focus" && (
        <path d="M 105 90 Q 110 92 115 90" stroke="#1a2136" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      {config.mood === "grin" && (
        <g>
          <path d="M 101 86 Q 110 98 119 86 Z" fill="#1a2136" />
          <path d="M 105 93 Q 110 97 115 93 Z" fill="#e2603f" opacity="0.85" />
        </g>
      )}

      {/* accessory */}
      {config.accessory === "glasses" && (
        <g fill="none" stroke="#1a2136" strokeWidth="1.9" opacity="0.75">
          <circle cx="97" cy="70" r="9.4" />
          <circle cx="123" cy="70" r="9.4" />
          <path d="M 106.4 70 h 7.2" />
          <path d="M 87.6 68 L 80 65" />
          <path d="M 132.4 68 L 140 65" />
        </g>
      )}
      {config.accessory === "headphones" && (
        <g>
          <path d="M 78 63 C 74 39 146 39 142 63" stroke="#1a2136" strokeWidth="5" fill="none" strokeLinecap="round" />
          <rect x="67" y="57" width="14" height="24" rx="6" fill="#1a2136" />
          <rect x="139" y="57" width="14" height="24" rx="6" fill="#1a2136" />
          <rect x="70" y="61" width="8" height="16" rx="4" fill={config.accent} />
          <rect x="142" y="61" width="8" height="16" rx="4" fill={config.accent} />
        </g>
      )}
      {config.accessory === "earrings" && (
        <g fill="#d9922b">
          <circle cx="80" cy="81" r="2.5" />
          <circle cx="140" cy="81" r="2.5" />
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Outfit                                                             */
/* ------------------------------------------------------------------ */

function Outfit({ config }: { config: CharacterConfig }) {
  const { outfit, top, topShade } = config;

  return (
    <g>
      <path d={TORSO_PATH} fill={top} />

      {outfit === "hoodie" && (
        <g>
          {/* hood bulk behind the head */}
          <path
            d="M 85 118 C 91 104 129 104 135 118 C 140 130 138 146 131 152 L 89 152 C 82 146 80 130 85 118 Z"
            fill={topShade}
          />
          <path d={TORSO_PATH} fill={top} />
          <path d="M 97 116 Q 110 129 123 116" stroke={topShade} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 105 126 v 22" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
          <path d="M 116 126 v 22" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
          <path d="M 73 212 h 74 v 16 a 6 6 0 0 1 -6 6 H 79 a 6 6 0 0 1 -6 -6 Z" fill={topShade} opacity="0.5" />
        </g>
      )}

      {outfit === "denim" && (
        <g>
          <path d="M 99 114 L 110 127 L 121 114 L 116 110 H 104 Z" fill="#fbf6ee" />
          <path d="M 110 127 V 246" stroke={topShade} strokeWidth="2" opacity="0.7" />
          <circle cx="110" cy="150" r="2.6" fill="#d9922b" />
          <circle cx="110" cy="172" r="2.6" fill="#d9922b" />
          <circle cx="110" cy="194" r="2.6" fill="#d9922b" />
        </g>
      )}

      {outfit === "sweater" && (
        <g>
          <path d="M 95 116 Q 110 131 125 116" stroke={topShade} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M 69 232 h 82 v 12 a 4 4 0 0 1 -4 4 H 73 a 4 4 0 0 1 -4 -4 Z" fill={topShade} />
        </g>
      )}

      {outfit === "tee" && (
        <path d="M 97 116 Q 110 128 123 116" stroke={topShade} strokeWidth="3" fill="none" strokeLinecap="round" />
      )}

      {outfit === "cardigan" && (
        <g>
          <path d="M 110 120 V 246" stroke={topShade} strokeWidth="2.4" opacity="0.8" />
          <path d="M 99 114 L 110 128 L 121 114 L 116 110 H 104 Z" fill="#fbf6ee" />
          <circle cx="110" cy="152" r="2.3" fill="#fbf6ee" />
          <circle cx="110" cy="174" r="2.3" fill="#fbf6ee" />
          <circle cx="110" cy="196" r="2.3" fill="#fbf6ee" />
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

function Laptop() {
  return (
    <g>
      <rect x="72" y="154" width="76" height="56" rx="5" fill="#1a2136" />
      <rect x="76" y="158" width="68" height="48" rx="3" fill="#f4f7fd" />
      <g>
        <rect x="82" y="166" width="20" height="3" rx="1.5" fill="#1f4ed8" />
        <rect x="105" y="166" width="30" height="3" rx="1.5" fill="#2f7d6c" />
        <rect x="88" y="174" width="34" height="3" rx="1.5" fill="#6b7690" />
        <rect x="88" y="182" width="22" height="3" rx="1.5" fill="#e2603f" />
        <rect x="113" y="182" width="24" height="3" rx="1.5" fill="#6b7690" />
        <rect x="88" y="190" width="40" height="3" rx="1.5" fill="#2f7d6c" />
        <rect x="82" y="198" width="14" height="3" rx="1.5" fill="#d9922b" />
      </g>
      <path d="M 66 210 h 88 l 8 12 H 58 Z" fill="#c9d2e2" />
      <path d="M 66 210 h 88 l 2.5 3.6 H 63.5 Z" fill="#aab6ca" />
      <rect x="98" y="213" width="24" height="3.4" rx="1.7" fill="#eef2f9" />
    </g>
  );
}

function Clipboard() {
  return (
    <g>
      <rect x="76" y="172" width="48" height="64" rx="5" fill="#1a2136" opacity="0.12" transform="translate(2 3)" />
      <rect x="76" y="172" width="48" height="64" rx="5" fill="#ffffff" stroke="#d8cfbe" strokeWidth="1.5" />
      <rect x="91" y="166" width="18" height="11" rx="3.5" fill="#3a465f" />
      {Array.from({ length: 5 }).map((_, i) => (
        <rect
          key={i}
          x="83"
          y={182 + i * 9}
          width={i === 0 ? 30 : 34 - (i % 3) * 6}
          height="3.4"
          rx="1.7"
          fill={i === 0 ? "#2f7d6c" : "#cfd6e4"}
        />
      ))}
      <path d="M 96 228 l 4 4 8 -9" stroke="#2f7d6c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Phone() {
  return (
    <g>
      <rect x="128" y="182" width="26" height="46" rx="6" fill="#1a2136" />
      <rect x="131" y="185" width="20" height="40" rx="4" fill="#f4f7fd" />
      <rect x="135" y="190" width="12" height="2.6" rx="1.3" fill="#1f4ed8" />
      <rect x="135" y="196" width="12" height="2.6" rx="1.3" fill="#cfd6e4" />
      <rect x="135" y="202" width="9" height="2.6" rx="1.3" fill="#cfd6e4" />
      <circle cx="141" cy="221" r="2.2" fill="#2f7d6c" />
    </g>
  );
}

function ProjectCard() {
  return (
    <g>
      <rect x="118" y="150" width="66" height="88" rx="6" fill="#1a2136" opacity="0.1" transform="translate(2 3)" />
      <rect x="118" y="150" width="66" height="88" rx="6" fill="#ffffff" stroke="#d8cfbe" strokeWidth="1.5" />
      <rect x="125" y="158" width="26" height="4" rx="2" fill="#1f4ed8" />
      <rect x="125" y="169" width="50" height="3" rx="1.5" fill="#cfd6e4" />
      <rect x="125" y="177" width="38" height="3" rx="1.5" fill="#cfd6e4" />
      <g>
        <rect x="125" y="192" width="8" height="18" rx="2" fill="#2f7d6c" />
        <rect x="136" y="198" width="8" height="12" rx="2" fill="#1f4ed8" />
        <rect x="147" y="187" width="8" height="23" rx="2" fill="#d9922b" />
        <rect x="158" y="203" width="8" height="7" rx="2" fill="#cfd6e4" />
      </g>
      <circle cx="172" cy="162" r="6" fill="#e0efe9" />
      <path d="M 169 162 l 2.2 2.2 3.6 -4" stroke="#2f7d6c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function QrPass() {
  return (
    <g>
      <rect x="126" y="180" width="34" height="48" rx="5" fill="#ffffff" stroke="#d8cfbe" strokeWidth="1.5" />
      <g fill="#1a2136">
        <rect x="131" y="185" width="9" height="9" rx="1.5" />
        <rect x="146" y="185" width="9" height="9" rx="1.5" />
        <rect x="131" y="200" width="9" height="9" rx="1.5" />
        <rect x="145" y="200" width="4" height="4" />
        <rect x="152" y="200" width="4" height="4" />
        <rect x="145" y="207" width="4" height="4" />
        <rect x="152" y="207" width="4" height="4" />
        <rect x="145" y="214" width="4" height="4" />
        <rect x="152" y="214" width="4" height="4" />
        <rect x="134" y="215" width="4" height="4" />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Character                                                          */
/* ------------------------------------------------------------------ */

export function Character({
  config,
  look = { x: 0, y: 0 },
  gesture = "none",
  className,
  showLegs = false,
  title,
}: {
  config: CharacterConfig;
  look?: Look;
  gesture?: "none" | "wave" | "nod";
  className?: string;
  showLegs?: boolean;
  title?: string;
}) {
  const arms = ARM_PATHS[config.pose];
  const hands = HAND_POINTS[config.pose];

  const headTransform = useMemo(
    () => `translate(${(look.x * 3).toFixed(2)} ${(look.y * 2).toFixed(2)})`,
    [look.x, look.y],
  );

  return (
    <svg
      viewBox="0 0 220 300"
      className={cn("char-svg h-full w-full", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* ground shadow */}
      <ellipse cx="110" cy={showLegs ? 292 : 254} rx="54" ry="7.5" fill="#131c31" opacity="0.08" />

      {showLegs && (
        <g>
          <path d="M 92 242 L 88 284" stroke={config.bottom} strokeWidth="21" strokeLinecap="round" fill="none" />
          <path d="M 128 242 L 132 284" stroke={config.bottom} strokeWidth="21" strokeLinecap="round" fill="none" />
          <path d="M 78 286 q 12 8 22 0 q -4 10 -22 0 Z" fill={config.shoes} />
          <path d="M 120 286 q 12 8 22 0 q -4 10 -22 0 Z" fill={config.shoes} />
        </g>
      )}

      <g className="char-body">
        <Outfit config={config} />

        {/* arms sit in front of the body so every pose reads clearly */}
        <g>
          <path d={arms.left} stroke={config.top} strokeWidth="17" strokeLinecap="round" fill="none" />
          <path
            d={arms.right}
            stroke={config.top}
            strokeWidth="17"
            strokeLinecap="round"
            fill="none"
            className={cn(
              "char-arm",
              config.pose === "wave" && "char-arm--wave",
              config.pose === "judge" && "char-arm--point",
              config.pose === "phone" && "char-arm--point",
              config.pose === "qr" && "char-arm--point",
            )}
          />
        </g>

        {/* hands */}
        <circle cx={hands.left[0]} cy={hands.left[1]} r="8.2" fill={config.skin} />
        <circle cx={hands.right[0]} cy={hands.right[1]} r="8.2" fill={config.skin} />

        {/* props */}
        {config.pose === "laptop" && <Laptop />}
        {config.pose === "clipboard" && <Clipboard />}
        {config.pose === "phone" && <Phone />}
        {config.pose === "judge" && <ProjectCard />}
        {config.pose === "qr" && <QrPass />}

        {/* head */}
        <g className={cn("char-head", gesture === "nod" && "char-nod")} transform={headTransform}>
          <path d={HEAD_PATH} fill={config.skin} />
          <Hair config={config} />
          <Face config={config} look={look} />
          {/* jaw shadow / neck */}
          <path d="M 102 93 h 16 v 22 c -6 5 -10 5 -16 0 Z" fill={config.skinShadow} />
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Cast                                                               */
/* ------------------------------------------------------------------ */

export const CAST: Record<string, CharacterConfig> = {
  mira: {
    id: "mira",
    name: "Mira",
    role: "Participant",
    skin: "#9c613c",
    skinShadow: "#87512f",
    hair: "curly",
    hairColor: "#241a16",
    outfit: "hoodie",
    top: "#2f7d6c",
    topShade: "#26685a",
    bottom: "#2b3446",
    shoes: "#fbf6ee",
    pose: "laptop",
    mood: "grin",
    accessory: "earrings",
    accent: "#2f7d6c",
  },
  theo: {
    id: "theo",
    name: "Theo",
    role: "Team lead",
    skin: "#e9b98f",
    skinShadow: "#d3a175",
    hair: "fade",
    hairColor: "#2b1d16",
    outfit: "denim",
    top: "#3f6fb5",
    topShade: "#33598f",
    bottom: "#2b3446",
    shoes: "#131c31",
    pose: "wave",
    mood: "smile",
    accessory: "none",
    accent: "#3f6fb5",
  },
  ada: {
    id: "ada",
    name: "Ada",
    role: "Organizer",
    skin: "#f6d9c0",
    skinShadow: "#e4bfa2",
    hair: "bun",
    hairColor: "#4a2c1d",
    outfit: "cardigan",
    top: "#e2603f",
    topShade: "#c94e30",
    bottom: "#3a465f",
    shoes: "#131c31",
    pose: "clipboard",
    mood: "smile",
    accessory: "glasses",
    accent: "#e2603f",
  },
  kenji: {
    id: "kenji",
    name: "Kenji",
    role: "Judge",
    skin: "#c98a5b",
    skinShadow: "#b1764a",
    hair: "ponytail",
    hairColor: "#1d1614",
    outfit: "sweater",
    top: "#1f4ed8",
    topShade: "#1a41b4",
    bottom: "#2b3446",
    shoes: "#fbf6ee",
    pose: "judge",
    mood: "focus",
    accessory: "none",
    accent: "#1f4ed8",
  },
  noor: {
    id: "noor",
    name: "Noor",
    role: "Venue manager",
    skin: "#6f4429",
    skinShadow: "#5f3922",
    hair: "beanie",
    hairColor: "#d9922b",
    outfit: "sweater",
    top: "#d9922b",
    topShade: "#bd7c1e",
    bottom: "#2b3446",
    shoes: "#131c31",
    pose: "phone",
    mood: "grin",
    accessory: "headphones",
    accent: "#d9922b",
  },
  isha: {
    id: "isha",
    name: "Isha",
    role: "Participant",
    skin: "#f6d9c0",
    skinShadow: "#e5c3a6",
    hair: "long",
    hairColor: "#1d1614",
    outfit: "tee",
    top: "#e2603f",
    topShade: "#c94e30",
    bottom: "#2b3446",
    shoes: "#fbf6ee",
    pose: "qr",
    mood: "smile",
    accessory: "none",
    accent: "#e2603f",
  },
};

// Aliases for backwards compatibility and fallback safety
CAST.leo = CAST.theo;
CAST.marcus = CAST.kenji;
