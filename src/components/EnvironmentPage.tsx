import React from "react";
import { SizeCard } from "./SizeCard";
import { FishingCard } from "./FishingCard";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { DivingCard } from "./DivingCard";
import { FishPotsCard } from "./FishPotsCard";
import { PriorityAreasCard } from "./PriorityAreasCard";
import { MinWidthCard } from "./MinWidthCard";

export const EnvironmentPage = () => {
  return (
    <>
      <SizeCard />
      <FishingCard />
      <DivingCard />
      <PriorityAreasCard />
      <FishPotsCard />
      <MinWidthCard />
      <SketchAttributesCard autoHide />
    </>
  );
};
