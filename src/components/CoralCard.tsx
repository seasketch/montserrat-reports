import React from "react";
import {
  Collapse,
  ClassTable,
  SketchClassTable,
  ResultsCard,
  useSketchProperties,
  ToolbarCard,
  LayerToggle,
  HorizontalStackedBar,
  ReportChartFigure,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  toPercentMetric,
  squareMeterToKilometer,
  valueFormatter,
  percentWithEdge,
} from "@seasketch/geoprocessing/client-core";

import project from "../../project";
import Translator from "./TranslatorAsync";
import { Trans, useTranslation } from "react-i18next";

const metricGroup = project.getMetricGroup("coralOverlap");
const precalcMetrics = project.getPrecalcMetrics(
  metricGroup,
  "count",
  metricGroup.classKey
);

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const CoralCard = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const mapLabel = t("Map");
  const typeLabel = t("Type");
  const pointsWithin = t("Platforms Within Plan");
  const percPointsWithin = `% ${t("Platforms Within Plan")}`;
  const pointLabel = t("Platforms");

  interface ClassGroupMetricValues {
    [classId: string]: {
      groupId: string;
      value: number;
    }[];
  }

  const config = {
    rows: metricGroup.classes.map((curClass) => curClass),
    target: metricGroup.classes.map((curClass) =>
      curClass.objectiveId
        ? project.getObjectiveById(curClass.objectiveId).target
        : undefined
    ),
    rowConfigs: [
      {
        title: "",
      },
    ],
    max: 100,
  };

  // Mapping groupIds to colors
  const groupColorMap: Record<string, string> = {
    "No-Take": "#BEE4BE",
    "Partial-Take": "#FFE1A3",
  };
  const groupColors = Object.values(groupColorMap);
  const blockGroupStyles = groupColors.map((curBlue) => ({
    backgroundColor: curBlue,
  }));

  const groupIds = ["No-Take", "Partial-Take"];

  return (
    <>
      <ResultsCard
        title={t("Oil Exploration Platforms")}
        functionName="coralOverlap"
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

          // get just metrics with groupId, excluding collection
          const groupMetrics = data.metrics.filter(
            (m) =>
              m.groupId !== null && m.sketchId !== data.sketch.properties.id
          );

          // sum overlap counts for each class and group
          const classGroupMetricValues: ClassGroupMetricValues =
            metricGroup.classes.reduce((acc, curClass) => {
              const values = groupIds.map((groupId) => {
                const groupMetric = groupMetrics.filter(
                  (m) => m.groupId === groupId && m.classId === curClass.classId
                );
                const value = groupMetric.reduce(
                  (acc, cur) => acc + cur.value,
                  0
                );
                return {
                  groupId,
                  value,
                };
              });

              return {
                ...acc,
                [curClass.classId]: values,
              };
            }, {});

          return (
            <ToolbarCard
              title={t("Coral Species")}
              items={
                <LayerToggle
                  label={mapLabel}
                  layerId={metricGroup.layerId}
                  simple
                />
              }
            >
              <ReportChartFigure>
                {metricGroup.classes.map((curClass, index) => (
                  <div style={{ paddingBottom: "30px" }} key={index}>
                    <HorizontalStackedBar
                      key={index}
                      {...{
                        rows: [
                          classGroupMetricValues[curClass.classId].map(
                            (curGroup) => [
                              // underlying values and targets are scaled out of 100 to make equal width bars
                              (curGroup.value /
                                project.getObjectiveById(curClass.objectiveId!)
                                  .target) *
                                100,
                            ]
                          ),
                        ],
                        target: 100,
                        rowConfigs: [
                          {
                            title: curClass.display,
                          },
                        ],
                        max: 100,
                      }}
                      blockGroupNames={["No-Take", "Partial-Take"]}
                      blockGroupStyles={blockGroupStyles}
                      // legend is only shown for last class
                      showLegend={
                        index < metricGroup.classes.length - 1 ? false : true
                      }
                      valueFormatter={(value: number) =>
                        (
                          project.getObjectiveById(curClass.objectiveId!)
                            .target / 100
                        ).toFixed(0)
                      }
                      targetValueFormatter={(value: number) =>
                        "Of " +
                        project.getObjectiveById(curClass.objectiveId!).target +
                        " observations"
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
                <Trans i18nKey="Oil Platforms - learn more">
                  <p>
                    {" "}
                    This report summarizes overlap with coral species
                    observation data collected by IUCN.
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
  const childSketchMetrics = metricsWithSketchId(
    data.metrics.filter((m) => m.metricId === metricGroup.metricId),
    childSketchIds
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childSketches
  );
  return <SketchClassTable rows={sketchRows} metricGroup={metricGroup} />;
};
