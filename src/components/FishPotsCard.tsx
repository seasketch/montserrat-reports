import React from "react";
import {
  Collapse,
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
} from "@seasketch/geoprocessing/client-core";

import project from "../../project";
import { Trans, useTranslation } from "react-i18next";

const metricGroup = project.getMetricGroup("fishPotsOverlap");
const fishPotsTarget = 158;

export const FishPotsCard = () => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const mapLabel = t("Map");

  interface ClassGroupMetricValues {
    [classId: string]: {
      groupId: string;
      value: number;
    }[];
  }

  // Mapping groupIds to colors
  const groupColorMap: Record<string, string> = {
    "No-Take": "#BEE4BE",
    "Partial-Take": "#FFE1A3",
  };
  const groupColors = Object.values(groupColorMap);
  const blockGroupStyles = groupColors.map((curGroup) => ({
    backgroundColor: curGroup,
  }));

  const groupIds = ["No-Take", "Partial-Take"];

  return (
    <>
      <ResultsCard
        title={t("Fish Pots")}
        functionName="fishPotsOverlap"
        useChildCard
      >
        {(data: ReportResult) => {
          // get just collection metrics with groupIds
          const groupMetrics = data.metrics.filter(
            (m) =>
              m.groupId !== null && m.sketchId === data.sketch.properties.id
          );

          // sum overlap counts for each class and group
          const classGroupMetricValues: ClassGroupMetricValues =
            metricGroup.classes.reduce((acc, curClass) => {
              const values = groupIds.map((groupId) => {
                const groupMetric = groupMetrics.filter(
                  (m) => m.groupId === groupId && m.classId === curClass.classId
                );
                const value = groupMetric[0].value;
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
              title={t("Fish Pots")}
              items={
                <LayerToggle
                  label={mapLabel}
                  layerId={metricGroup.layerId}
                  simple
                />
              }
            >
              <div
                style={{
                  marginBottom: "-30px",
                  marginTop: "40px",
                  marginLeft: "-50px",
                }}
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
                                (curGroup.value / fishPotsTarget) * 100,
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
                          ((value / 100) * fishPotsTarget).toFixed(0)
                        }
                        targetValueFormatter={() =>
                          "Out Of " +
                          project.getObjectiveById(curClass.objectiveId!).target
                        }
                      />
                    </div>
                  ))}
                </ReportChartFigure>
              </div>

              {isCollection && (
                <Collapse title={t("Show by MPA")}>
                  {genSketchTable(data)}
                </Collapse>
              )}

              <Collapse title={t("Learn more")}>
                <Trans i18nKey="Fish Pots - learn more">
                  <p> This report summarizes overlap with fish pots.</p>
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
