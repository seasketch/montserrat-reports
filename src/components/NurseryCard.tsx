import React from "react";
import {
  Collapse,
  ResultsCard,
  useSketchProperties,
  ToolbarCard,
  VerticalSpacer,
  LayerToggle,
} from "@seasketch/geoprocessing/client-ui";
import { ReportResult } from "@seasketch/geoprocessing/client-core";

import project from "../../project";
import { useTranslation } from "react-i18next";
import { Histogram } from "./Histogram";
import { firstMatchingMetric, sketchToId } from "@seasketch/geoprocessing";

const metricGroup = project.getMetricGroup("nurseryOverlap");

const abundanceValues = [
  0.375, 0.008333333, 0.008333333, 0.025, 0.016666667, 0.008333333, 0.008333333,
  0.033333333, 0.016666667, 0.008333333, 0.016666667, 0.033333333, 0.041666667,
  0.066666667, 0.033333333, 0.108333333, 0.008333333, 0.041666667, 0.016666667,
  0.025, 0.016666667, 0.008333333, 0.008333333, 0.041666667, 0.016666667,
  0.033333333, 0.025, 0.008333333, 0.233333333, 0.016666667, 0.058333333,
  0.008333333, 0.191666667, 0.016666667, 0.008333333, 0.066666667, 0.016666667,
  0.008333333, 0.075, 0.008333333, 0.008333333, 0.033333333, 0.041666667,
  0.058333333, 0.033333333, 0.083333333, 0.15, 0.008333333, 0.141666667,
  0.166666667, 0.008333333, 0.008333333, 0.166666667, 0.025, 0.016666667,
  0.091666667, 0.125, 0.008333333, 0.1, 0.125, 0.158333333, 0.008333333,
  0.158333333, 0.008333333, 0.158333333, 0.033333333, 0.1, 0.008333333,
  0.058333333, 0.05, 0.075, 0.05, 0.033333333, 0.05, 0.083333333, 0.275,
  0.066666667, 0.008333333, 0.016666667, 0.05, 0.05, 0.008333333, 0.075,
  0.039473684, 0.033333333, 0.05, 0.108333333, 0.1, 0.241666667, 0.033333333,
  0.016666667, 0.008333333, 0.008333333, 0.02173913, 0.025, 0.275, 0.016666667,
  0.025, 0.183333333, 0.016666667, 0.008333333, 0.35, 0.033333333, 0.166666667,
  0.091666667, 0.05, 0.008333333, 0.041666667, 0.05,
];

export const NurseryCard = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const mapLabel = t("Map");

  return (
    <>
      <ResultsCard
        title={t("Fish Pots")}
        functionName="nurseryOverlap"
        useChildCard
      >
        {(data: ReportResult) => {
          return (
            <ToolbarCard
              title={t("Nursery Areas")}
              items={
                <LayerToggle
                  label={mapLabel}
                  layerId={metricGroup.layerId}
                  simple
                />
              }
            >
              <VerticalSpacer />
              This chart show the minimum, mean, and maximum abundance
              measurements of nursery areas that were taken within this
              collection {"(reserves only)"}, overlaid on the distribution of
              abundance within Montserrat waters.
              <VerticalSpacer height="2rem" />
              <Histogram
                data={abundanceValues}
                height={350}
                width={450}
                mean={
                  !isCollection
                    ? data.metrics[0].value
                    : firstMatchingMetric(
                        data.metrics,
                        (m) => m.sketchId === data.sketch.properties.id
                      ).value
                }
                min={
                  !isCollection
                    ? (data.metrics[0].extra!.minValue as number)
                    : (firstMatchingMetric(
                        data.metrics,
                        (m) => m.sketchId === data.sketch.properties.id
                      ).extra!.minValue as number)
                }
                max={
                  !isCollection
                    ? (data.metrics[0].extra!.maxValue as number)
                    : (firstMatchingMetric(
                        data.metrics,
                        (m) => m.sketchId === data.sketch.properties.id
                      ).extra!.maxValue as number)
                }
              ></Histogram>
            </ToolbarCard>
          );
        }}
      </ResultsCard>
    </>
  );
};
