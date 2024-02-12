import {
  Sketch,
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  rekeyMetrics,
  sortMetrics,
  NullSketchCollection,
  NullSketch,
  getSketchFeatures,
} from "@seasketch/geoprocessing";
import project from "../../project";
import {
  overlapArea,
  overlapAreaGroupMetrics,
} from "@seasketch/geoprocessing/src";
import {
  firstMatchingMetric,
  getUserAttribute,
} from "@seasketch/geoprocessing/client-core";

const metricGroup = project.getMetricGroup("boundaryAreaOverlap");
// Hard code total area of Montserrat 3nm boundary
const boundaryTotalMetrics: Metric[] = [
  {
    classId: "montserrat_3nm_jurisdiction",
    metricId: "boundaryAreaOverlap",
    sketchId: null,
    groupId: null,
    geographyId: null,
    value: 373298362.032,
  },
];
const totalAreaMetric = firstMatchingMetric(
  boundaryTotalMetrics,
  (m) => m.groupId === null
);

export async function boundaryAreaOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const areaMetrics = (
    await overlapArea(metricGroup.metricId, sketch, totalAreaMetric.value, {
      includePercMetric: false,
    })
  ).map(
    (metric): Metric => ({
      ...metric,
      classId: metricGroup.classes[0].classId,
    })
  );

  // Generate area metrics grouped by zone type
  // Each sketch gets one group metric for its zone type, while collection generates one for each zone type
  const sketchToZoneType = getZoneType(sketch);
  const metricToZoneType = (sketchMetric: Metric) => {
    return sketchToZoneType[sketchMetric.sketchId!];
  };

  const levelMetrics = await overlapAreaGroupMetrics({
    metricId: metricGroup.metricId,
    groupIds: [
      "No-Take",
      "Partial-Take",
      "Utility",
      "Multi-Use",
      "Volcanic Exclusion",
    ],
    sketch: sketch,
    metricToGroup: metricToZoneType,
    metrics: areaMetrics,
    classId: metricGroup.classes[0].classId,
    outerArea: totalAreaMetric.value,
  });

  return {
    metrics: sortMetrics(rekeyMetrics([...areaMetrics, ...levelMetrics])),
    sketch: toNullSketch(sketch),
  };
}

/**
 * Gets zone type for all sketches in a sketch collection from user attributes
 * @param sketch User-created Sketch | SketchCollection
 * @returns <string, string> mapping of sketchId to zone type
 */
export function getZoneType(
  sketch: Sketch | SketchCollection | NullSketchCollection | NullSketch
): Record<string, string> {
  const sketchFeatures = getSketchFeatures(sketch);
  const zoneTypes = sketchFeatures.reduce<Record<string, string>>(
    (types, sketch) => {
      const zoneType = getUserAttribute(sketch.properties, "zoneType", "")[0];
      types[sketch.properties.id] = zoneType;
      return types;
    },
    {}
  );
  return zoneTypes;
}

export default new GeoprocessingHandler(boundaryAreaOverlap, {
  title: "boundaryAreaOverlap",
  description: "Calculate sketch overlap with boundary polygons",
  executionMode: "async",
  timeout: 40,
  requiresProperties: [],
  memory: 10240,
});
