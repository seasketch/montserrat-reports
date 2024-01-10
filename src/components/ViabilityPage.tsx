import React from "react";
import { SizeCard } from "./SizeCard";
import { FishingCard } from "./FishingCard";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";

export const ViabilityPage = () => {
  return (
    <>
      <SizeCard />
      <FishingCard />
      <SketchAttributesCard autoHide />
    </>
  );
};
