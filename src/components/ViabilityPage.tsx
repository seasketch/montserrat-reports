import React from "react";
import { SizeCard } from "./SizeCard";
import { FishingCard } from "./FishingCard";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { DivingCard } from "./DivingCard";

export const ViabilityPage = () => {
  return (
    <>
      <SizeCard />
      <FishingCard />
      <DivingCard />
      <SketchAttributesCard autoHide />
    </>
  );
};
