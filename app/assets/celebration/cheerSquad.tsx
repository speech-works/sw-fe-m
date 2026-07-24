import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

/**
 * THE CHEER SQUAD — bespoke celebration characters for the onboarding
 * "You're all set!" moment.
 *
 * Not the Explore practice-icons (those are the OBJECTS you practise with —
 * 3D glasses, a mask). This screen wants who's WELCOMING you in, so each buddy
 * is a distinct joyful reaction, in one of the four category colours:
 *   reading·blue = beaming · fun·amber = winking ·
 *   cognitive·coral = starstruck · exposure·purple = cool.
 *
 * Each is a coloured orb (the app's material: a top-left glow + a hairline rim)
 * with a minimal ink face. `ink` is the caller-supplied on-colour for that
 * accent, so features stay legible on every orb. Static by design — the
 * celebration screen owns entrance/float/tap; these just need to be expressive.
 */

interface CheerProps {
  size?: number;
  /** The orb fill — pass the category accent. */
  color: string;
  /** The face-ink colour — pass the accent's AA on-colour. */
  ink: string;
}

/** Shared orb material: fill + soft top-left glow + hairline rim. */
const Orb: React.FC<{ id: string; color: string }> = ({ id, color }) => (
  <>
    <Defs>
      <RadialGradient id={id} cx="34%" cy="26%" r="75%">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.24" />
        <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="24" cy="24" r="24" fill={color} />
    <Circle cx="24" cy="24" r="24" fill={`url(#${id})`} />
    <Circle
      cx="24"
      cy="24"
      r="23"
      fill="none"
      stroke="#FFFFFF"
      strokeOpacity="0.16"
      strokeWidth="1.2"
    />
  </>
);

const stroke = (ink: string, w = 2.7) => ({
  stroke: ink,
  strokeWidth: w,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
});

/** Blue · Beaming — squeezed-shut happy eyes + a big open grin. */
export const CheerBeam: React.FC<CheerProps> = ({ size = 62, color, ink }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Orb id="cs-beam" color={color} />
    <Path d="M13 22 Q17 16.5 21 22" {...stroke(ink)} />
    <Path d="M27 22 Q31 16.5 35 22" {...stroke(ink)} />
    {/* open grin */}
    <Path
      d="M15 28 Q24 29.5 33 28 Q30 37 24 37 Q18 37 15 28 Z"
      fill={ink}
    />
    {/* tongue */}
    <Path d="M20.5 34 Q24 38 27.5 34 Q24 35.6 20.5 34 Z" fill="#FF8FA0" />
  </Svg>
);

/** Amber · Winking — one round eye, one wink, a cheeky lopsided smile. */
export const CheerWink: React.FC<CheerProps> = ({ size = 62, color, ink }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Orb id="cs-wink" color={color} />
    {/* open eye */}
    <Ellipse cx="18" cy="20.5" rx="2.4" ry="3.1" fill={ink} />
    <Circle cx="18.9" cy="19.4" r="0.85" fill="#FFFFFF" />
    {/* wink */}
    <Path d="M27 20.5 Q31 23.5 35 20.5" {...stroke(ink)} />
    {/* lopsided grin */}
    <Path
      d="M16 29 Q24 31 32 28.5 Q30 35.5 23 35 Q18 34.6 16 29 Z"
      fill={ink}
    />
    <Path d="M21 33 Q24.5 36.5 28 33.5 Q24.5 34.8 21 33 Z" fill="#FF8FA0" />
  </Svg>
);

/** Coral · Starstruck — 4-point sparkle eyes + a small "wow" mouth. */
export const CheerStar: React.FC<CheerProps> = ({ size = 62, color, ink }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Orb id="cs-star" color={color} />
    {/* sparkle eyes */}
    <G fill={ink}>
      <Path d="M17 15.5 C17.7 19.6 18.4 20.3 22.5 21 C18.4 21.7 17.7 22.4 17 26.5 C16.3 22.4 15.6 21.7 11.5 21 C15.6 20.3 16.3 19.6 17 15.5 Z" />
      <Path d="M31 15.5 C31.7 19.6 32.4 20.3 36.5 21 C32.4 21.7 31.7 22.4 31 26.5 C30.3 22.4 29.6 21.7 25.5 21 C29.6 20.3 30.3 19.6 31 15.5 Z" />
    </G>
    {/* wow mouth */}
    <Ellipse cx="24" cy="32" rx="3.4" ry="3.7" fill={ink} />
    <Path d="M21.4 33.6 Q24 36.4 26.6 33.6 Z" fill="#FF8FA0" />
  </Svg>
);

/** Purple · Cool — relaxed lidded eyes + a confident smirk. */
export const CheerCool: React.FC<CheerProps> = ({ size = 62, color, ink }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Orb id="cs-cool" color={color} />
    {/* chill lidded eyes */}
    <Path d="M14 21 Q18 18.5 22 21" {...stroke(ink, 2.9)} />
    <Path d="M26 21 Q30 18.5 34 21" {...stroke(ink, 2.9)} />
    {/* confident smirk (rises to the right) */}
    <Path d="M17 30 Q23.5 32.5 32 27.5" {...stroke(ink, 2.9)} />
    {/* a tiny glint */}
    <Path
      d="M33 15 C33.4 17 33.8 17.4 35.8 17.8 C33.8 18.2 33.4 18.6 33 20.6 C32.6 18.6 32.2 18.2 30.2 17.8 C32.2 17.4 32.6 17 33 15 Z"
      fill="#FFFFFF"
      opacity={0.85}
    />
  </Svg>
);
