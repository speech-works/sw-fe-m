import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { HEAD } from "../sw-faces/faceKit";

/**
 * CHEER HERO — the single celebration character for onboarding's "You're all
 * set!" moment. ONE expressive face, Duolingo-style, not a lineup.
 *
 * It is the app's OWN character shape: the `HEAD` squircle plate (imported from
 * faceKit, exactly as the avatar system does), with the brand material — drop
 * shadow + gloss — and the signature round eyes with catchlights. Not a plain
 * circle (those read as generic emoji). Purpose-built joyful expression: wide
 * happy eyes and a big open grin.
 *
 * Static — the celebration screen owns entrance / float / tap.
 */

const INK = "#191A1F";

interface CheerHeroProps {
  size?: number;
  /** Plate fill — the celebration hero is the brand orange. */
  color: string;
}

const CheerHero: React.FC<CheerHeroProps> = ({ size = 120, color }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      {/* Brand plate material: top-left highlight fading to a foot shade. */}
      <RadialGradient id="ch-gloss" cx="34%" cy="22%" r="82%">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.3" />
        <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
        <Stop offset="1" stopColor="#000000" stopOpacity="0.16" />
      </RadialGradient>
      <RadialGradient id="ch-cheek" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#FF7A59" stopOpacity="0.55" />
        <Stop offset="1" stopColor="#FF7A59" stopOpacity="0" />
      </RadialGradient>
    </Defs>

    {/* Soft dropped depth (the faceKit Plate idiom). */}
    <Path fill="#000000" opacity={0.1} transform="translate(0 4)" d={HEAD} />
    <Path fill="#000000" opacity={0.08} transform="translate(0 2)" d={HEAD} />
    {/* The plate + gloss. */}
    <Path fill={color} d={HEAD} />
    <Path fill="url(#ch-gloss)" d={HEAD} />

    {/* Rosy cheeks. */}
    <Ellipse cx="13.5" cy="27" rx="4" ry="2.8" fill="url(#ch-cheek)" />
    <Ellipse cx="34.5" cy="27" rx="4" ry="2.8" fill="url(#ch-cheek)" />

    {/* Signature round eyes with catchlights, opened wide for joy. */}
    <Circle cx="18" cy="20.5" r="3.4" fill={INK} />
    <Circle cx="16.9" cy="19.3" r="1.1" fill="#FFFFFF" />
    <Circle cx="18.9" cy="21.6" r="0.5" fill="#FFFFFF" opacity={0.7} />
    <Circle cx="30" cy="20.5" r="3.4" fill={INK} />
    <Circle cx="28.9" cy="19.3" r="1.1" fill="#FFFFFF" />
    <Circle cx="30.9" cy="21.6" r="0.5" fill="#FFFFFF" opacity={0.7} />

    {/* Big open grin + tongue. */}
    <Path
      d="M15 28 Q24 30 33 28 Q30 37.5 24 37.5 Q18 37.5 15 28 Z"
      fill={INK}
    />
    <Path d="M20.5 34 Q24 38.4 27.5 34 Q24 35.8 20.5 34 Z" fill="#FF8FA0" />
  </Svg>
);

export default CheerHero;
