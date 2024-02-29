import React from "react";
import { CoralCard } from "./CoralCard";
import { BenthicCard } from "./BenthicCard";
import { FishPotsCard } from "./FishPotsCard";
import { NurseryCard } from "./NurseryCard";

export const OverviewPage = () => {
  return (
    <>
      <CoralCard />
      <BenthicCard />
      <FishPotsCard />
      <NurseryCard />
    </>
  );
};
