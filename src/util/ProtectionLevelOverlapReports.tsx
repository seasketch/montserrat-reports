import React from "react";
import {
  Collapse,
  SketchClassTable,
  ReportChartFigure,
  Column,
  GroupPill,
  Table,
  GroupCircleRow,
  ObjectiveStatus,
  SketchClassTableStyled,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  Metric,
  MetricGroup,
  toPercentMetric,
  GroupMetricAgg,
  firstMatchingMetric,
  flattenByGroupAllClass,
  isSketchCollection,
  percentWithEdge,
  OBJECTIVE_YES,
  OBJECTIVE_NO,
  Objective,
  ObjectiveAnswer,
} from "@seasketch/geoprocessing/client-core";
import {
  groupColorMap,
  groupDisplayMapPl,
  protectionLevels,
  protectionLevelsDisplay,
} from "./getMpaProtectionLevel";
import { HorizontalStackedBar, RowConfig } from "./HorizontalStackedBar";
import project from "../../project";

export interface ClassTableGroupedProps {
  showDetailedObjectives: boolean;
  showLegend: boolean;
  showLayerToggles: boolean;
  showTargetPass: boolean;
}

/**
 * Creates grouped overlap report for sketch
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const groupedSketchReport = (
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any,
  options?: ClassTableGroupedProps
) => {
  // Get total precalc areas
  const totalAreas = metricGroup.classes.reduce<Record<string, number>>(
    (acc, curClass) => {
      return {
        ...acc,
        [curClass.classId]: firstMatchingMetric(
          precalcMetrics,
          (m) => m.groupId === null && m.classId === curClass.classId
        ).value,
      };
    },
    {}
  );

  // Filter down to metrics which have groupIds
  const levelMetrics = data.metrics.filter(
    (m) => m.groupId && protectionLevels.includes(m.groupId)
  );

  // Filter down grouped metrics to ones that count for each class
  const totalsByClass = metricGroup.classes.reduce<Record<string, number[]>>(
    (acc, curClass) => {
      const classMetrics = levelMetrics.filter(
        (m) => m.classId === curClass.classId
      );
      const objective = curClass.objectiveId;
      const values = objective
        ? classMetrics
            .filter((levelAgg) => {
              const level = levelAgg.groupId;
              return (
                project.getObjectiveById(objective).countsToward[level!] ===
                OBJECTIVE_YES
              );
            })
            .map((yesAgg) => yesAgg.value / totalAreas[curClass.classId])
        : classMetrics.map(
            (group) => group.value / totalAreas[curClass.classId]
          );

      return { ...acc, [curClass.classId]: values };
    },
    {}
  );

  return genClassTableGrouped(metricGroup, totalsByClass, t, options);
};

/**
 * Creates grouped overlap report for sketch collection
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const groupedCollectionReport = (
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any,
  options?: ClassTableGroupedProps
) => {
  if (!isSketchCollection(data.sketch)) throw new Error("NullSketch");

  // Filter down to metrics which have groupIds
  const levelMetrics = data.metrics.filter(
    (m) => m.groupId && protectionLevels.includes(m.groupId)
  );

  const groupLevelAggs: GroupMetricAgg[] = flattenByGroupAllClass(
    data.sketch,
    levelMetrics,
    precalcMetrics
  );

  console.log(groupLevelAggs);

  // Filter down grouped metrics to ones that count for each class
  const totalsByClass = metricGroup.classes.reduce<Record<string, number[]>>(
    (acc, curClass) => {
      const objective = curClass.objectiveId;
      const values = objective
        ? groupLevelAggs
            .filter((levelAgg) => {
              const level = levelAgg.groupId;
              return (
                project.getObjectiveById(objective).countsToward[level!] ===
                OBJECTIVE_YES
              );
            })
            .map((yesAgg) => yesAgg[curClass.classId] as number)
        : groupLevelAggs.map((group) => group[curClass.classId] as number);

      return { ...acc, [curClass.classId]: values };
    },
    {}
  );

  return (
    <>
      {genClassTableGrouped(metricGroup, totalsByClass, t, options)}

      <Collapse title={t("Show by Protection Level")}>
        {genGroupLevelTable(data, precalcMetrics, metricGroup, t)}
      </Collapse>
    </>
  );
};

/**
 * Creates grouped overlap report for sketch collection
 * @param metricGroup metric group to get stats for
 * @param totalsByClass percent overlap for each class for each protection level
 * @param t TFunction
 */
export const genClassTableGrouped = (
  metricGroup: MetricGroup,
  totalsByClass: Record<string, number[]>,
  t: any,
  options?: ClassTableGroupedProps
) => {
  const finalOptions = {
    showDetailedObjectives: true,
    showLegend: true,
    showLayerToggles: true,
    showTargetPass: false,
    ...options,
  };
  // Coloring and styling for horizontal bars
  const groupColors = Object.values(groupColorMap);
  const blockGroupNames = protectionLevelsDisplay.map((level) => t(level));
  const blockGroupStyles = groupColors.map((curBlue) => ({
    backgroundColor: curBlue,
  }));
  const valueFormatter = (value: number) => percentWithEdge(value / 100);

  const rowConfig: RowConfig[] = [];
  metricGroup.classes.forEach((curClass) => {
    rowConfig.push({
      title: curClass.display,
      layerId: curClass.layerId || "",
    });
  });

  const config = {
    rows: metricGroup.classes.map((curClass) =>
      totalsByClass[curClass.classId].map((value) => [value * 100])
    ),
    target: metricGroup.classes.map((curClass) =>
      curClass.objectiveId
        ? project.getObjectiveById(curClass.objectiveId).target * 100
        : undefined
    ),
    rowConfigs: rowConfig,
    max: 100,
  };

  const targetLabel = t("Target");

  return (
    <>
      {finalOptions.showDetailedObjectives &&
        metricGroup.classes.map((curClass) => {
          if (curClass.objectiveId) {
            const objective = project.getObjectiveById(curClass.objectiveId);

            // Get total percentage within sketch
            const percSum = totalsByClass[curClass.classId].reduce(
              (sum, value) => sum + value,
              0
            );

            // Checks if the objective is met
            const isMet =
              percSum >= objective.target ? OBJECTIVE_YES : OBJECTIVE_NO;

            return (
              <React.Fragment key={objective.objectiveId}>
                <CollectionObjectiveStatus
                  objective={objective}
                  objectiveMet={isMet}
                  t={t}
                  renderMsg={
                    Object.keys(collectionMsgs).includes(objective.objectiveId)
                      ? collectionMsgs[objective.objectiveId](
                          objective,
                          isMet,
                          t
                        )
                      : collectionMsgs["default"](objective, isMet, t)
                  }
                />
              </React.Fragment>
            );
          }
        })}
      <ReportChartFigure>
        <HorizontalStackedBar
          {...config}
          blockGroupNames={blockGroupNames}
          blockGroupStyles={blockGroupStyles}
          valueFormatter={valueFormatter}
          targetValueFormatter={(value) => targetLabel + ` - ` + value + `%`}
          showLayerToggles={finalOptions.showLayerToggles}
          showLegend={finalOptions.showLegend}
          showTargetPass={finalOptions.showTargetPass}
        />
      </ReportChartFigure>
    </>
  );
};

/**
 * Properties for getting objective status for sketch collection
 * @param objective Objective
 * @param objectiveMet ObjectiveAnswer
 * @param renderMsg function that takes (objective, groupId)
 */
export interface CollectionObjectiveStatusProps {
  objective: Objective;
  objectiveMet: ObjectiveAnswer;
  t: any;
  renderMsg: any;
}

/**
 * Presents objectives for single sketch
 * @param CollectionObjectiveStatusProps containing objective, objective
 */
export const CollectionObjectiveStatus: React.FunctionComponent<CollectionObjectiveStatusProps> =
  ({ objective, objectiveMet, t }) => {
    const msg = Object.keys(collectionMsgs).includes(objective.objectiveId)
      ? collectionMsgs[objective.objectiveId](objective, objectiveMet, t)
      : collectionMsgs["default"](objective, objectiveMet, t);

    return <ObjectiveStatus status={objectiveMet} msg={msg} />;
  };

/**
 * Renders messages beased on objective and if objective is met for sketch collections
 */
export const collectionMsgs: Record<string, any> = {
  default: (objective: Objective, objectiveMet: ObjectiveAnswer, t: any) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t("This plan meets the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t(objective.shortDesc)}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t("This plan does not meet the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t(objective.shortDesc)}
        </>
      );
    }
  },
  ocean_space_protected: (
    objective: Objective,
    objectiveMet: ObjectiveAnswer,
    t: any
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t("This plan meets the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>{" "}
          {t("of the Belize Ocean Space.")}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t("This plan does not meet the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>{" "}
          {t("of the Belize Ocean Space.")}
        </>
      );
    }
  },
  ocean_space_highly_protected: (
    objective: Objective,
    objectiveMet: ObjectiveAnswer,
    t: any
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t("This plan meets the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>{" "}
          {t("of the Belize Ocean Space in High Protection Biodiversity Zones")}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t("This plan does not meet the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>{" "}
          {t("of the Belize Ocean Space in High Protection Biodiversity Zones")}
        </>
      );
    }
  },
};

/**
 * Creates "Show by Protection Level" report
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genGroupLevelTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any
) => {
  if (!isSketchCollection(data.sketch)) throw new Error("NullSketch");

  // Filter down to metrics which have groupIds
  const levelMetrics = data.metrics.filter(
    (m) => m.groupId && protectionLevels.includes(m.groupId)
  );

  const levelAggs: GroupMetricAgg[] = flattenByGroupAllClass(
    data.sketch,
    levelMetrics,
    precalcMetrics
  );

  const classColumns: Column<Record<string, string | number>>[] =
    metricGroup.classes.map((curClass) => ({
      Header: curClass.display,
      accessor: (row) => {
        return (
          <GroupPill
            groupColorMap={groupColorMap}
            group={row.groupId.toString()}
          >
            {percentWithEdge(row[curClass.classId] as number)}
          </GroupPill>
        );
      },
    }));

  const columns: Column<Record<string, string | number>>[] = [
    {
      Header: t("This plan contains") + ":",
      accessor: (row) => (
        <GroupCircleRow
          group={row.groupId.toString()}
          groupColorMap={groupColorMap}
          circleText={`${row.numSketches}`}
          rowText={t(groupDisplayMapPl[row.groupId])}
        />
      ),
    },
    ...classColumns,
  ];
  return (
    <SketchClassTableStyled>
      <Table
        className="styled"
        columns={columns}
        data={levelAggs.sort((a, b) => a.groupId.localeCompare(b.groupId))}
      />
    </SketchClassTableStyled>
  );
};

/**
 * Creates "Show by MPA" report
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genSketchTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup
) => {
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
