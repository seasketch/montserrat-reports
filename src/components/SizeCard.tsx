import React from "react";
import {
  ReportResult,
  percentWithEdge,
  keyBy,
  toNullSketchArray,
  nestMetrics,
  valueFormatter,
  toPercentMetric,
  sortMetricsDisplayOrder,
  isSketchCollection,
  MetricGroup,
} from "@seasketch/geoprocessing/client-core";
import {
  ClassTable,
  Collapse,
  Column,
  ReportTableStyled,
  ResultsCard,
  Table,
  useSketchProperties,
  ToolbarCard,
  InfoStatus,
  GroupCircleRow,
  GroupPill,
} from "@seasketch/geoprocessing/client-ui";
import styled from "styled-components";
import project from "../../project";
import { Metric, squareMeterToKilometer } from "@seasketch/geoprocessing";
import Translator from "../components/TranslatorAsync";
import { Trans, useTranslation } from "react-i18next";
import { TFunction } from "i18next";

// Hard code total area of 3nm boundary
const boundaryTotalMetrics: Metric[] = [
  {
    classId: "3nm_jurisdiction",
    metricId: "boundaryAreaOverlap",
    sketchId: null,
    groupId: null,
    geographyId: null,
    value: 373298362.032,
  },
];

const Number = new Intl.NumberFormat("en", { style: "decimal" });

// Mapping groupIds to colors
const groupColorMap: Record<string, string> = {
  "No-Take": "#BEE4BE",
  "Partial-Take": "#FFE1A3",
};

export const SmallReportTableStyled = styled(ReportTableStyled)`
  font-size: 13px;

  th:first-child {
    text-align: left;
  }

  th {
    text-align: center;
  }

  td {
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

export const SizeCard = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();
  const metricGroup = project.getMetricGroup("boundaryAreaOverlap", t);

  const notFoundString = t("Results not found");

  /* i18next-extract-disable-next-line */
  const planningUnitName = t(project.basic.planningAreaName);
  return (
    <ResultsCard
      title={t("Size")}
      functionName="boundaryAreaOverlap"
      useChildCard
    >
      {(data: ReportResult) => {
        if (Object.keys(data).length === 0) throw new Error(notFoundString);

        return (
          <>
            <ToolbarCard
              title={t(" ")}
              items={
                <>
                  <InfoStatus
                    size={30}
                    msg={
                      <span>
                        <Trans i18nKey="Report info status">
                          These are <b>draft</b> reports. Further changes or
                          corrections may be made. Please report any issues.
                          <br></br>
                          <br></br>
                        </Trans>
                      </span>
                    }
                  />
                </>
              }
            >
              {genSingleSizeTable(data, metricGroup, t)}
              {genZoneSizeTable(data, metricGroup, t)}
              {isCollection && (
                <Collapse title={t("Show by MPA")}>
                  {genNetworkSizeTable(data, metricGroup, t)}
                </Collapse>
              )}
              <Collapse title={t("Learn more")}>
                <Trans i18nKey="SizeCard - learn more">
                  <p>
                    {" "}
                    This report summarizes the size and proportion of this plan
                    within these boundaries.
                  </p>
                  <p>
                    If sketch boundaries within a plan overlap with each other,
                    the overlap is only counted once.
                  </p>
                </Trans>
              </Collapse>
            </ToolbarCard>
          </>
        );
      }}
    </ResultsCard>
  );
};

const genSingleSizeTable = (
  data: ReportResult,
  mg: MetricGroup,
  t: TFunction
) => {
  const boundaryLabel = t("Boundary");
  const foundWithinLabel = t("Found Within Plan");
  const areaWithinLabel = t("Area Within Plan");
  const areaPercWithinLabel = `% ${t("Area Within Plan")}`;
  const mapLabel = t("Map");
  const sqKmLabel = t("km²");

  const classesById = keyBy(mg.classes, (c) => c.classId);
  let singleMetrics = data.metrics.filter(
    (m) => m.sketchId === data.sketch.properties.id
  );

  const finalMetrics = sortMetricsDisplayOrder(
    [
      ...singleMetrics,
      ...toPercentMetric(
        singleMetrics,
        boundaryTotalMetrics,
        project.getMetricGroupPercId(mg)
      ),
    ],
    "classId",
    ["eez", "offshore", "contiguous"]
  );

  return (
    <>
      <ClassTable
        rows={finalMetrics}
        metricGroup={mg}
        objective={project.getMetricGroupObjectives(mg, t)}
        // objective={null}
        columnConfig={[
          {
            columnLabel: boundaryLabel,
            type: "class",
            width: 25,
          },
          {
            columnLabel: areaWithinLabel,
            type: "metricValue",
            metricId: mg.metricId,
            valueFormatter: (val: string | number) =>
              Number.format(
                Math.round(
                  squareMeterToKilometer(
                    typeof val === "string" ? parseInt(val) : val
                  )
                )
              ),
            valueLabel: sqKmLabel,
            width: 20,
          },
          {
            columnLabel: areaPercWithinLabel,
            type: "metricChart",
            metricId: project.getMetricGroupPercId(mg),
            valueFormatter: "percent",
            chartOptions: {
              showTitle: true,
              showTargetLabel: true,
              targetLabelPosition: "bottom",
              targetLabelStyle: "tight",
              barHeight: 11,
            },
            width: 40,
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
    </>
  );
};

const genNetworkSizeTable = (
  data: ReportResult,
  mg: MetricGroup,
  t: TFunction
) => {
  const sketches = toNullSketchArray(data.sketch);

  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);
  const sketchIds = sketches.map((sk) => sk.properties.id);
  const sketchMetrics = data.metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId)
  );
  const finalMetrics = [
    ...sketchMetrics,
    ...toPercentMetric(
      sketchMetrics,
      boundaryTotalMetrics,
      project.getMetricGroupPercId(mg)
    ),
  ];

  const aggMetrics = nestMetrics(finalMetrics, [
    "sketchId",
    "classId",
    "metricId",
  ]);
  // Use sketch ID for each table row, index into aggMetrics
  const rows = Object.keys(aggMetrics).map((sketchId) => ({
    sketchId,
  }));

  const classColumns: Column<{ sketchId: string }>[] = mg.classes.map(
    (curClass, index) => {
      /* i18next-extract-disable-next-line */
      const transString = t(curClass.display);
      return {
        Header: " ",
        columns: [
          {
            Header: t("Area") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value;
              return (
                Number.format(Math.round(squareMeterToKilometer(value))) +
                " " +
                t("km²")
              );
            },
          },
          {
            Header: t("% 3 nautical miles") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  project.getMetricGroupPercId(mg)
                ][0].value;
              return percentWithEdge(value);
            },
          },
        ],
      };
    }
  );

  const columns: Column<any>[] = [
    {
      Header: "Zone",
      accessor: (row) => (
        <GroupPill
          groupColorMap={groupColorMap}
          group={sketchesById[row.sketchId!].properties.zoneType}
        >
          {sketchesById[row.sketchId!].properties.name}
        </GroupPill>
      ),
    },
    ...classColumns,
  ];

  return (
    <NetworkTableStyled>
      <Table columns={columns} data={rows} />
    </NetworkTableStyled>
  );
};

const genZoneSizeTable = (
  data: ReportResult,
  mg: MetricGroup,
  t: TFunction
) => {
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
    ...toPercentMetric(
      sketchMetrics,
      boundaryTotalMetrics,
      project.getMetricGroupPercId(mg)
    ),
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
            Header: "This plan includes:",
            accessor: (row) => {
              return (
                <GroupCircleRow
                  group={row.groupId}
                  groupColorMap={groupColorMap}
                  circleText={numSketches[row.groupId]}
                  rowText={
                    <>
                      <b>{`${row.groupId + " Zone(s)"}`}</b>
                    </>
                  }
                />
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
            Header: t("% 3 nautical miles") + " ".repeat(index),
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

/**
 * SizeCard as a top-level report client
 */
export const SizeCardReportClient = () => {
  return (
    <Translator>
      <SizeCard />
    </Translator>
  );
};
