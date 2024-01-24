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
  valueFormatter,
  nestMetrics,
  MetricGroup,
  percentWithEdge,
  Metric,
} from "@seasketch/geoprocessing/client-core";

import project from "../../project";
import Translator from "./TranslatorAsync";
import { Trans, useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import styled from "styled-components";
import { isSketchCollection } from "@seasketch/geoprocessing";

export const SmallReportTableStyled = styled(ReportTableStyled)`
  font-size: 13px;

  th {
    padding-bottom: 0.9rem !important;
  }

  th:first-child {
    text-align: left;
  }

  th:nth-child(2) {
    text-align: center;
  }

  td {
    text-align: left;
  }

  td:nth-child(2) {
    text-align: center;
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

// Mapping groupIds to colors
const groupColorMap: Record<string, string> = {
  "No-Take": "#BEE4BE",
  "Partial-Take": "#FFE1A3",
};

const metricGroup = project.getMetricGroup("fishingValueOverlap");
const precalcMetrics = project.getPrecalcMetrics(metricGroup, "sum", "3nm");

console.log("precalcMetrics", precalcMetrics);

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
            ...toPercentMetric(singleMetrics, precalcMetrics, {
              metricIdOverride: project.getMetricGroupPercId(metricGroup),
            }),
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
              {genZoneTable(data, metricGroup, t)}
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

const genZoneTable = (data: ReportResult, mg: MetricGroup, t: TFunction) => {
  const sketches = toNullSketchArray(data.sketch);
  const numSketches = sketches.reduce(
    (groupCounts: Record<string, number>, curSketch) => {
      const zoneType: string = curSketch.properties.zoneType;
      if (groupCounts[zoneType]) {
        groupCounts[zoneType] += 1;
      } else {
        groupCounts[zoneType] = 1;
      }
      return groupCounts;
    },
    {}
  );
  const sketchGroupIds = sketches.reduce((groupIds: string[], curSketch) => {
    const zoneType: string = curSketch.properties.zoneType;
    return [...groupIds, ...zoneType];
  }, []);
  const sketchMetrics = data.metrics.filter(
    (m) => m.groupId && sketchGroupIds.includes(m.groupId)
  );

  const finalMetrics = [
    ...sketchMetrics,
    ...toPercentMetric(sketchMetrics, precalcMetrics, {
      metricIdOverride: project.getMetricGroupPercId(mg),
    }),
  ];

  const aggMetrics = nestMetrics(finalMetrics, [
    "groupId",
    "classId",
    "metricId",
  ]);

  // Use group ID for each table row, index into aggMetrics
  const rows = Object.keys(aggMetrics).map((groupId) => ({
    groupId,
  }));

  const columns: Column<{ groupId: string }>[] = mg.classes.map(
    (curClass, index) => {
      /* i18next-extract-disable-next-line */
      const transString = t(curClass.display);
      return {
        Header: " ",
        id: "zoneTableHeader",
        style: { color: "#777" },
        columns: [
          {
            Header: "Zone Types:",
            accessor: (row) => {
              return (
                <GroupPill groupColorMap={groupColorMap} group={row.groupId}>
                  {row.groupId}
                </GroupPill>
              );
            },
          },
          {
            Header: t("% Value") + " ".repeat(index),
            accessor: (row) => {
              const value = aggMetrics[row.groupId][curClass.classId as string][
                project.getMetricGroupPercId(mg)
              ].reduce((value: number, curMetric: Metric) => {
                // if sketch is a collection, only add the total collection value - else, just get the single value
                const curValue = isSketchCollection(data.sketch)
                  ? curMetric.extra && curMetric.extra.isCollection === true
                    ? curMetric.value
                    : 0
                  : curMetric.value;
                return value + curValue;
              }, 0);
              return (
                <GroupPill groupColorMap={groupColorMap} group={row.groupId}>
                  {percentWithEdge(value)}
                </GroupPill>
              );
            },
          },
        ],
      };
    }
  );

  return (
    <SmallReportTableStyled>
      <Table columns={columns} data={rows} />
    </SmallReportTableStyled>
  );
};
