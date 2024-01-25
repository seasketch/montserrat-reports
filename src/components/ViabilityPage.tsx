import React from "react";
import { SizeCard } from "./SizeCard";
import { FishingCard } from "./FishingCard";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { DivingCard } from "./DivingCard";
import { CoralCard } from "./CoralCard";
import { BenthicCard } from "./BenthicCard";
import { FishPotsCard } from "./FishPotsCard";
import { PriorityAreasCard } from "./PriorityAreasCard";

export const ViabilityPage = () => {
  return (
    <>
      <SizeCard />
      <FishingCard />
      <DivingCard />
      <CoralCard />
      <BenthicCard />
      <FishPotsCard />
      <PriorityAreasCard />
      <SketchAttributesCard autoHide />
    </>
  );
};
