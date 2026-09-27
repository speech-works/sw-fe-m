import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import RecHeroCard from "./Dashboard/RecHeroCard";
import { icons } from "../design-system";
import {
  CrisisResource,
  crisisActionLabel,
  crisisActionUrl,
} from "../api/crisis";
import { handleLinkPress } from "../util/functions/externalLinks";

/**
 * What stands in a recommendation's slot when the assessment marks someone in
 * crisis. The backend sends `crisisSupport` on the offers payload in that
 * state and badges nothing, so there is no pitch to show: this card shows
 * their country's helpline instead. It names no state and makes no claim
 * about the person. It says somebody is there to talk to.
 */
const CrisisSupportCard = ({
  resource,
  style,
}: {
  resource: CrisisResource;
  style?: StyleProp<ViewStyle>;
}) => (
  <RecHeroCard
    eyebrow="SUPPORT"
    title="Someone to talk to, any time"
    subtitle={`${resource.helplineName}. ${resource.description}`}
    ctaLabel={crisisActionLabel(resource)}
    ctaIcon={icons.call}
    onPress={() => handleLinkPress(crisisActionUrl(resource))}
    style={style}
  />
);

export default CrisisSupportCard;
