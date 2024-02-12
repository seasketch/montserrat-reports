import {
  Sketch,
  Feature,
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  overlapFeatures,
  rekeyMetrics,
  getFlatGeobufFilename,
  isInternalVectorDatasource,
  sortMetrics,
  NullSketchCollection,
  NullSketch,
  getSketchFeatures,
  getUserAttribute,
  overlapFeaturesGroupMetrics,
  isSketchCollection,
} from "@seasketch/geoprocessing";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import project from "../../project";

const featuresByClass: Record<string, Feature<Polygon>[]> = {};

export async function benthicHabitatsOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const box = sketch.bbox || bbox(sketch);
  const metricGroup = project.getMetricGroup("benthicHabitatsOverlap");

  const protectionGroups = ["No-Take", "Partial-Take"];
  const isCollection = isSketchCollection(sketch);

  // if collection, remove any sketches that are not protection zones
  if (isCollection) {
    sketch.features = sketch.features.filter((f) => {
      return protectionGroups.includes(f.properties.zoneType[0]);
    });
  }

  let cachedFeatures: Record<string, Feature<Polygon>[]> = {};

  const polysByBoundary = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        if (!curClass.datasourceId) {
          throw new Error(`Missing datasourceId ${curClass.classId}`);
        }
        const ds = project.getDatasourceById(curClass.datasourceId);
        if (isInternalVectorDatasource(ds)) {
          const url = `${project.dataBucketUrl()}${getFlatGeobufFilename(ds)}`;

          // Fetch features overlapping with sketch, pull from cache if already fetched
          const dsFeatures =
            cachedFeatures[curClass.datasourceId] ||
            (await fgbFetchAll<Feature<Polygon>>(url, box));
          cachedFeatures[curClass.datasourceId] = dsFeatures;

          // If this is a sub-class, filter by class name, exclude null geometry too
          // ToDo: should do deeper match to classKey
          const finalFeatures =
            ds.classKeys.length > 0
              ? dsFeatures.filter((feat) => {
                  return (
                    feat.geometry &&
                    feat.properties![ds.classKeys[0]] === curClass.classId
                  );
                }, [])
              : dsFeatures;
          featuresByClass[curClass.classId] = finalFeatures;

          return finalFeatures;
        }
        return [];
      })
    )
  ).reduce<Record<string, Feature<Polygon>[]>>((acc, polys, classIndex) => {
    return {
      ...acc,
      [metricGroup.classes[classIndex].classId]: polys,
    };
  }, {});

  const metrics: Metric[] = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        const overlapResult = await overlapFeatures(
          metricGroup.metricId,
          polysByBoundary[curClass.classId],
          sketch
        );
        return overlapResult.map(
          (metric): Metric => ({
            ...metric,
            classId: curClass.classId,
          })
        );
      })
    )
  ).reduce(
    // merge
    (metricsSoFar, curClassMetrics) => [...metricsSoFar, ...curClassMetrics],
    []
  );

  const test = "test";

  // if single sketch not of a protection zone type, set all metrics to 0
  if (
    !isCollection &&
    !protectionGroups.includes(sketch.properties.zoneType[0])
  ) {
    metrics.forEach((metric) => {
      metric.value = 0;
    });
  }

  const sketchToZoneType = getZoneType(sketch);
  const metricToZoneType = (sketchMetric: Metric) => {
    return sketchToZoneType[sketchMetric.sketchId!];
  };

  const levelMetrics = await overlapFeaturesGroupMetrics({
    metricId: metricGroup.metricId,
    groupIds: ["No-Take", "Partial-Take"],
    sketch: sketch,
    metricToGroup: metricToZoneType,
    metrics: metrics,
    featuresByClass: featuresByClass,
  });

  return {
    metrics: sortMetrics(rekeyMetrics([...metrics, ...levelMetrics])),
    sketch: toNullSketch(sketch),
  };
}

export default new GeoprocessingHandler(benthicHabitatsOverlap, {
  title: "benthicHabitatsOverlap",
  description: "Calculate sketch overlap with benthic habitat classes",
  executionMode: "async",
  timeout: 600,
  requiresProperties: [],
});

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
