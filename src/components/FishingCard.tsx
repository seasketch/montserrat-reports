import React from "react";
import {
  Collapse,
  ClassTable,
  SketchClassTable,
  ResultsCard,
  useSketchProperties,
  ToolbarCard,
  LayerToggle,
  Column,
  GroupPill,
  ReportTableStyled,
  Table,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  toPercentMetric,
  squareMeterToKilometer,
  valueFormatter,
  nestMetrics,
  keyBy,
  MetricGroup,
  percentWithEdge,
  NullSketch,
  NullSketchCollection,
  Metric,
} from "@seasketch/geoprocessing/client-core";

import project from "../../project";
import Translator from "./TranslatorAsync";
import { Trans, useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import styled from "styled-components";

export const NetworkTableStyled = styled(ReportTableStyled)`
  font-size: 13px;

  th:first-child {
    text-align: left;
  }

  th:nth-child(3) {
    text-align: center;
  }

  th {
    text-align: left;
  }

  td {
    text-align: left;
  }

  td:nth-child(3) {
    text-align: center;
  }
`;

// Mapping groupIds to colors
const groupColorMap: Record<string, string> = {
  "No-Take": "#BEE4BE",
  "Partial-Take": "#FFE1A3",
};

const metricGroup = project.getMetricGroup("fishingValueOverlap");
const precalcMetrics = project.getPrecalcMetrics(
  metricGroup,
  "sum",
  metricGroup.classKey
);

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const FishingCard = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const mapLabel = t("Map");
  const classLabel = t("Value");
  const valueLabel = t("Value within plan");
  const percAreaWithin = `% ${t("Value Within Plan")}`;

  return (
    <>
      <ResultsCard
        title={t("Fishing Value")}
        functionName="fishingValueOverlap"
        useChildCard
      >
        {(data: ReportResult) => {
          let singleMetrics = data.metrics.filter(
            (m) => m.sketchId === data.sketch.properties.id
          );

          const finalMetrics = [
            ...singleMetrics,
            ...toPercentMetric(
              singleMetrics,
              precalcMetrics,
              project.getMetricGroupPercId(metricGroup)
            ),
          ];

          return (
            <ToolbarCard
              title={t("Fishing Value")}
              items={
                <LayerToggle
                  label={mapLabel}
                  layerId={metricGroup.layerId}
                  simple
                />
              }
            >
              <Translator>
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
                      columnLabel: valueLabel,
                      type: "metricValue",
                      metricId: metricGroup.metricId,
                      valueFormatter: (val: string | number) =>
                        Number.format(
                          Math.round(
                            typeof val === "string" ? parseInt(val) : val
                          )
                        ),
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
                      },
                      width: 30,
                      targetValueFormatter: (
                        value: number,
                        row: number,
                        numRows: number
                      ) => {
                        if (row === 0) {
                          return (value: number) =>
                            `${valueFormatter(value / 100, "percent0dig")} ${t(
                              "Target"
                            )}`;
                        } else {
                          return (value: number) =>
                            `${valueFormatter(value / 100, "percent0dig")}`;
                        }
                      },
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
                <Trans i18nKey="Fishing Value Card - learn more">
                  <p>
                    {" "}
                    This report summarizes the amount of fishing value overlap
                    within this plan. Fishing value was estimated via an Ocean
                    Use Survey which asked local fishers to identify the areas
                    they value most for fishing.
                  </p>
                  <p>
                    If zone boundaries overlap with each other, the overlap is
                    only counted once.
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
