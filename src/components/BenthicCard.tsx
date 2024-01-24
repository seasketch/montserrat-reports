import React from "react";
import {
  Collapse,
  ClassTable,
  SketchClassTable,
  ResultsCard,
  useSketchProperties,
  ToolbarCard,
  LayerToggle,
  Pill,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  toPercentMetric,
  squareMeterToKilometer,
} from "@seasketch/geoprocessing/client-core";

import project from "../../project";
import Translator from "./TranslatorAsync";
import { Trans, useTranslation } from "react-i18next";

const metricGroup = project.getMetricGroup("benthicHabitatsOverlap");
const precalcMetrics = project.getPrecalcMetrics(metricGroup, "area", "3nm");

const Number = new Intl.NumberFormat("en", { style: "decimal" });

// Mapping groupIds to colors
const groupColorMap: Record<string, string> = {
  "No-Take": "#BEE4BE",
  "Partial-Take": "#FFE1A3",
};

export const BenthicCard = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const mapLabel = t("Map");
  const classLabel = t("Depth");
  const areaWithin = t("Area Within Plan");
  const percAreaWithin = `% ${t("Area Within Plan")}`;
  const sqKmLabel = t("km²");

  return (
    <>
      <ResultsCard
        title={t("Benthic Habitats")}
        functionName="benthicHabitatsOverlap"
        useChildCard
      >
        {(data: ReportResult) => {
          let singleMetrics = data.metrics.filter(
            (m) =>
              m.sketchId === data.sketch.properties.id && m.groupId === null
          );

          const finalMetrics = [
            ...singleMetrics,
            ...toPercentMetric(singleMetrics, precalcMetrics, {
              metricIdOverride: project.getMetricGroupPercId(metricGroup),
            }),
          ];

          const noTakeMetrics = data.metrics.filter(
            (m) =>
              m.sketchId === data.sketch.properties.id &&
              m.groupId === "No-Take"
          );

          const finalNoTakeMetrics = [
            ...noTakeMetrics,
            ...toPercentMetric(noTakeMetrics, precalcMetrics, {
              metricIdOverride: project.getMetricGroupPercId(metricGroup),
            }),
          ];

          const partialTakeeMetrics = data.metrics.filter(
            (m) =>
              m.sketchId === data.sketch.properties.id &&
              m.groupId === "Partial-Take"
          );

          const finalPartialTakeMetrics = [
            ...partialTakeeMetrics,
            ...toPercentMetric(partialTakeeMetrics, precalcMetrics, {
              metricIdOverride: project.getMetricGroupPercId(metricGroup),
            }),
          ];

          return (
            <ToolbarCard
              title={t("Benthic Habitats")}
              items={
                <LayerToggle
                  label={mapLabel}
                  layerId={metricGroup.layerId}
                  simple
                />
              }
            >
              <Translator>
                <br />
                <Pill color={"lightblue"}>All Reserves</Pill>
                <ClassTable
                  rows={finalMetrics}
                  metricGroup={metricGroup}
                  columnConfig={[
                    {
                      columnLabel: classLabel,
                      type: "class",
                      width: 30,
                    },
                    {
                      columnLabel: areaWithin,
                      type: "metricValue",
                      metricId: metricGroup.metricId,
                      valueFormatter: (val: string | number) =>
                        Number.format(
                          squareMeterToKilometer(
                            typeof val === "string" ? parseInt(val) : val
                          )
                        ),
                      valueLabel: sqKmLabel,
                      width: 30,
                    },
                    {
                      columnLabel: percAreaWithin,
                      type: "metricChart",
                      metricId: project.getMetricGroupPercId(metricGroup),
                      valueFormatter: "percent",
                      chartOptions: {
                        showTitle: true,
                        targetLabelPosition: "bottom",
                        targetLabelStyle: "tight",
                        barHeight: 11,
                        target: 30,
                      },
                      width: 30,
                    },
                  ]}
                />
                <br />
                <Pill color={groupColorMap["No-Take"]}>No-Take Reserves</Pill>
                <ClassTable
                  rows={finalNoTakeMetrics}
                  metricGroup={metricGroup}
                  columnConfig={[
                    {
                      columnLabel: classLabel,
                      type: "class",
                      width: 30,
                    },
                    {
                      columnLabel: areaWithin,
                      type: "metricValue",
                      metricId: metricGroup.metricId,
                      valueFormatter: (val: string | number) =>
                        Number.format(
                          squareMeterToKilometer(
                            typeof val === "string" ? parseInt(val) : val
                          )
                        ),
                      valueLabel: sqKmLabel,
                      width: 30,
                    },
                    {
                      columnLabel: percAreaWithin,
                      type: "metricChart",
                      metricId: project.getMetricGroupPercId(metricGroup),
                      valueFormatter: "percent",
                      chartOptions: {
                        showTitle: true,
                        targetLabelPosition: "bottom",
                        targetLabelStyle: "tight",
                        barHeight: 11,
                        target: 30,
                      },
                      width: 30,
                    },
                  ]}
                />
                <br />
                <Pill color={groupColorMap["Partial-Take"]}>
                  Partial-Take Reserves
                </Pill>
                <ClassTable
                  rows={finalPartialTakeMetrics}
                  metricGroup={metricGroup}
                  columnConfig={[
                    {
                      columnLabel: classLabel,
                      type: "class",
                      width: 30,
                    },
                    {
                      columnLabel: areaWithin,
                      type: "metricValue",
                      metricId: metricGroup.metricId,
                      valueFormatter: (val: string | number) =>
                        Number.format(
                          squareMeterToKilometer(
                            typeof val === "string" ? parseInt(val) : val
                          )
                        ),
                      valueLabel: sqKmLabel,
                      width: 30,
                    },
                    {
                      columnLabel: percAreaWithin,
                      type: "metricChart",
                      metricId: project.getMetricGroupPercId(metricGroup),
                      valueFormatter: "percent",
                      chartOptions: {
                        showTitle: true,
                        targetLabelPosition: "bottom",
                        targetLabelStyle: "tight",
                        barHeight: 11,
                        target: 30,
                      },
                      width: 30,
                    },
                  ]}
                />
              </Translator>

              {isCollection && (
                <Collapse title={t("Show by MPA")}>
                  {genSketchTable(data)}
                </Collapse>
              )}

              <Collapse title={t("Learn more")}>
                <Trans i18nKey="Bathy Classes Card - learn more">
                  <p>
                    {" "}
                    This report summarizes benthic habitats overlap within this
                    plan, broken down by zone protection level.
                  </p>
                  <p>
                    If zone boundaries overlap with each other, the overlap is
                    only counted once. If a zone with a higher protection level
                    overlaps a zone with a lower protection level, the higher
                    level takes precedence and the overlap is counted only
                    towards the higher level.
                  </p>
                </Trans>
              </Collapse>
            </ToolbarCard>
          );
        }}
      </ResultsCard>
    </>
  );
};

const genSketchTable = (data: ReportResult) => {
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(
      data.metrics.filter((m) => m.metricId === metricGroup.metricId),
      childSketchIds
    ),
    precalcMetrics
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childSketches
  );
  return (
    <SketchClassTable rows={sketchRows} metricGroup={metricGroup} formatPerc />
  );
};
