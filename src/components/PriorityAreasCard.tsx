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
  Column,
  GroupPill,
  // SmallReportTableStyled,
  Table,
  ReportTableStyled,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  toPercentMetric,
  squareMeterToKilometer,
  Metric,
  MetricGroup,
  isSketchCollection,
  nestMetrics,
  percentWithEdge,
} from "@seasketch/geoprocessing/client-core";

import project from "../../project";
import Translator from "./TranslatorAsync";
import { Trans, useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import styled from "styled-components";
import { isNullSketchCollection } from "@seasketch/geoprocessing";

const metricGroup = project.getMetricGroup("priorityAreasOverlap");
const precalcMetrics = project.getPrecalcMetrics(metricGroup, "area", "3nm");

const Number = new Intl.NumberFormat("en", { style: "decimal" });

const protectionGroups = ["No-Take", "Partial-Take"];

// Mapping groupIds to colors
const groupColorMap: Record<string, string> = {
  "No-Take": "#BEE4BE",
  "Partial-Take": "#FFE1A3",
};

export const SmallReportTableStyled = styled(ReportTableStyled)`
  font-size: 13px;

  th {
    padding-bottom: 0.9rem !important;
  }

  th:first-child {
    text-align: left;
    width: 35%;
  }

  th:nth-child(2) {
    text-align: left;
    width: 35%;
  }

  td {
    text-align: left;
  }

  td:nth-child(2) {
    text-align: left;
  }
`;

export const PriorityAreasCard = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const mapLabel = t("Map");
  const classLabel = t("Class");
  const areaWithin = t("Area Within Plan");
  const percAreaWithin = `% ${t("Area Within Plan")}`;
  const sqKmLabel = t("km²");

  return (
    <>
      <ResultsCard
        title={t("Priority Conservation Areas")}
        functionName="priorityAreasOverlap"
        useChildCard
      >
        {(data: ReportResult) => {
          let singleMetrics = data.metrics.filter(
            (m) =>
              m.sketchId === data.sketch.properties.id && m.groupId === null
          );

          const features = isNullSketchCollection(data.sketch)
            ? data.sketch.features
            : [data.sketch];

          const includedGroups = features.map((f) => f.properties.zoneType[0]);

          const groupOverlap = includedGroups.filter((g) =>
            protectionGroups.includes(g)
          );

          const noProtectedSketches = groupOverlap.length === 0;

          singleMetrics[0].value = noProtectedSketches
            ? 0
            : singleMetrics[0].value;

          const finalMetrics = [
            ...singleMetrics,
            ...toPercentMetric(singleMetrics, precalcMetrics, {
              metricIdOverride: project.getMetricGroupPercId(metricGroup),
            }),
          ];

          return (
            <ToolbarCard
              title={t("Priority Conservation Areas")}
              items={
                <LayerToggle
                  label={mapLabel}
                  layerId={metricGroup.layerId}
                  simple
                />
              }
            >
              <VerticalSpacer />
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
              {genZoneTable(data, metricGroup, t)}
              {isCollection && (
                <Collapse title={t("Show by MPA")}>
                  {genSketchTable(data)}
                </Collapse>
              )}

              <Collapse title={t("Learn more")}>
                <Trans i18nKey="Priority Areas Card - learn more">
                  <p>
                    {" "}
                    This report summarizes priority conservation area overlap
                    within this plan. Priority areas were defined based on
                    prioritizr conservation values.
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
            width: 20,
            accessor: (row) => {
              return (
                <GroupPill groupColorMap={groupColorMap} group={row.groupId}>
                  {row.groupId}
                </GroupPill>
              );
            },
          },
          {
            Header: t("Area") + " ".repeat(index),
            accessor: (row) => {
              const value = aggMetrics[row.groupId][curClass.classId as string][
                mg.metricId
                // sum all area values for each zone type, excluding the collection itself
              ].reduce((value: number, curMetric: Metric) => {
                const curValue = isSketchCollection(data.sketch)
                  ? curMetric.extra && curMetric.extra.isCollection === true
                    ? curMetric.value
                    : 0
                  : curMetric.value;
                return value + curValue;
              }, 0);
              return (
                Number.format(Math.round(squareMeterToKilometer(value))) +
                " " +
                t("km²")
              );
            },
          },
          {
            Header: t("% Area") + " ".repeat(index),
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
