import React from "react";
import ReactionWrapper from "./ReactionWrapper";
import { ReactionType } from "../../api/threads/types";
import CourageFace from "../../assets/sw-faces/CourageFace";
import ProudFace from "../../assets/sw-faces/ProudFace";
import StrengthFace from "../../assets/sw-faces/StrengthFace";
import WithYouFace from "../../assets/sw-faces/WithYouFace";
import CelebrateFace from "../../assets/sw-faces/CelebrateFace";

interface ReactionProps {
  type: ReactionType;
  selected: boolean;
  onPress?: () => void;
  size?: number;
  isPicker?: boolean;
}

export function AnimatedReaction({ type, selected, onPress, size = 32, isPicker = false }: ReactionProps) {
  let FaceComponent: any = WithYouFace;

  switch (type) {
    case "courage":
      FaceComponent = CourageFace;
      break;
    case "proud":
      FaceComponent = ProudFace;
      break;
    case "strength":
      FaceComponent = StrengthFace;
      break;
    case "with_you":
      FaceComponent = WithYouFace;
      break;
    case "celebrate":
      FaceComponent = CelebrateFace;
      break;
  }

  return (
    <ReactionWrapper selected={selected} onPress={onPress} size={size}>
      <FaceComponent size={size} shouldAnimate={isPicker || selected} />
    </ReactionWrapper>
  );
}
