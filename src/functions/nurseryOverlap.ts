import {
  Sketch,
  Feature,
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  rekeyMetrics,
  getFlatGeobufFilename,
  isInternalVectorDatasource,
  Point,
  sortMetrics,
  isSketchCollection,
} from "@seasketch/geoprocessing";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import project from "../../project";
import { getZoneType } from "../../scripts/getZoneType";
import { overlapPointsGroupMetrics } from "../../scripts/overlapGroupMetrics";
import { overlapPointValues } from "../../scripts/overlapPointValues";

const featuresByClass: Record<string, Feature<Point>[]> = {};

export async function nurseryOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const box = sketch.bbox || bbox(sketch);
  const metricGroup = project.getMetricGroup("nurseryOverlap");

  let cachedFeatures: Record<string, Feature<Point>[]> = {};

  const protectionGroups = ["No-Take", "Partial-Take"];
  const isCollection = isSketchCollection(sketch);

  // if collection, remove any sketches that are not protection zones
  if (isCollection) {
    sketch.features = sketch.features.filter((f) => {
      return protectionGroups.includes(f.properties.zoneType[0]);
    });
  }

  // features within bounding box of sketch
  const pointsByBoundary = (
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
            (await fgbFetchAll<Feature<Point>>(url, box));
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
  ).reduce<Record<string, Feature<Point>[]>>((acc, polys, classIndex) => {
    return {
      ...acc,
      [metricGroup.classes[classIndex].classId]: polys,
    };
  }, {});

  const metrics: Metric[] = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        const overlapResult = await overlapPointValues(
          metricGroup.metricId,
          pointsByBoundary[curClass.classId],
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

  return {
    metrics: sortMetrics(rekeyMetrics([...metrics])),
    sketch: toNullSketch(sketch),
  };
}

export default new GeoprocessingHandler(nurseryOverlap, {
  title: "nurseryOverlap",
  description: "Calculate sketch overlap with fish pots",
  executionMode: "async",
  timeout: 600,
  memory: 256,
  requiresProperties: [],
});
