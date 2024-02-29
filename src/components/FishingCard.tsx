import React from "react";
import {
  Collapse,
  SketchClassTable,
  ResultsCard,
  useSketchProperties,
  ToolbarCard,
  LayerToggle,
  ReportTableStyled,
  ReportChartFigure,
  HorizontalStackedBar,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  toPercentMetric,
  isNullSketchCollection,
} from "@seasketch/geoprocessing/client-core";

import project from "../../project";
import Translator from "./TranslatorAsync";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";

export const SmallReportTableStyled = styled(ReportTableStyled)`
  font-size: 13px;

  th {
    padding-bottom: 0.9rem !important;
  }

  th:first-child {
    text-align: left;
    width: 150px !important;
  }

  td {
    text-align: left;
  }
`;

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

const protectionGroups = ["No-Take", "Partial-Take"];

// Mapping protectionGroups to colors
const groupColorMap: Record<string, string> = {
  "No-Take": "#BEE4BE",
  "Partial-Take": "#FFE1A3",
};

const metricGroup = project.getMetricGroup("fishingValueOverlap");
const precalcMetrics = project.getPrecalcMetrics(metricGroup, "sum", "3nm");

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const FishingCard = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const mapLabel = t("Map");

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
            ...toPercentMetric(singleMetrics, precalcMetrics, {
              metricIdOverride: project.getMetricGroupPercId(metricGroup),
            }),
          ];

          const totalPercMetrics = finalMetrics.filter(
            (m) =>
              m.sketchId === data.sketch.properties.id &&
              m.groupId === null &&
              m.metricId === project.getMetricGroupPercId(metricGroup)
          );

          const groupTotalPercMetrics = finalMetrics.filter(
            (m) =>
              m.sketchId === data.sketch.properties.id &&
              m.groupId !== null &&
              m.metricId === project.getMetricGroupPercId(metricGroup)
          );

          // check for protection type sketches
          const features = isNullSketchCollection(data.sketch)
            ? data.sketch.features
            : [data.sketch];

          const includedGroups = features.map((f) => f.properties.zoneType[0]);

          const groupOverlap = includedGroups.filter((g) =>
            protectionGroups.includes(g)
          );

          const noProtectedSketches = groupOverlap.length === 0;

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
                <br />
                <div style={{ fontSize: 14 }}>
                  Percent value within plan:{" "}
                  <span style={{ fontWeight: "bold", fontSize: 15 }}>
                    {totalPercMetrics[0].value !== 0 && !noProtectedSketches
                      ? (totalPercMetrics[0].value * 100).toFixed(2)
                      : 0}
                    {"%"}
                  </span>
                </div>
              </Translator>
              <VerticalSpacer></VerticalSpacer>
              <ReportChartFigure>
                {protectionGroups.map((curGroup, index) => (
                  <div
                    style={{ paddingBottom: "10px", paddingLeft: "40px" }}
                    key={index}
                  >
                    <HorizontalStackedBar
                      key={index}
                      {...{
                        rows: [
                          groupTotalPercMetrics
                            .filter((m) => m.groupId === curGroup)
                            .map((curMetric) => [curMetric.value * 100]),
                        ],
                        rowConfigs: [
                          {
                            title: curGroup,
                          },
                        ],
                        max: 100,
                      }}
                      blockGroupNames={["No-Take", "Partial-Take"]}
                      blockGroupStyles={
                        curGroup === "No-Take"
                          ? [{ backgroundColor: "#BEE4BE" }]
                          : [{ backgroundColor: "#FFE1A3" }]
                      }
                      // legend is only shown for last class
                      showLegend={false}
                      valueFormatter={(value: number) =>
                        value !== 0 ? value.toFixed(2) + "%" : "0%"
                      }
                    />
                  </div>
                ))}
              </ReportChartFigure>
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
