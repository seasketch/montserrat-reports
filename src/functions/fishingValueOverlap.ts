import {
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  Sketch,
  SketchCollection,
  toNullSketch,
  rekeyMetrics,
  sortMetrics,
  overlapRaster,
  getCogFilename,
  NullSketchCollection,
  NullSketch,
  getSketchFeatures,
  getUserAttribute,
  Georaster,
} from "@seasketch/geoprocessing";
import { loadCogWindow } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import project from "../../project";
import { overlapRasterGroupMetrics } from "../../scripts/overlapRasterGroupMetrics";

const metricGroup = project.getMetricGroup("fishingValueOverlap");
const featuresByClass: Record<string, Georaster> = {};

const protectionLevels = ["No-Take", "Partial-Take"];

export async function fishingValueOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const box = sketch.bbox || bbox(sketch);
  const metrics: Metric[] = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        // start raster load and move on in loop while awaiting finish
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass}`);
        const url = `${project.dataBucketUrl()}${getCogFilename(
          curClass.datasourceId
        )}`;
        const raster = await loadCogWindow(url, {
          windowBox: box,
        });
        featuresByClass[curClass.classId] = raster;

        // start analysis as soon as source load done
        const overlapResult = await overlapRaster(
          metricGroup.metricId,
          raster,
          sketch
        );

        return overlapResult.map(
          (metrics): Metric => ({
            ...metrics,
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

  const sketchToZoneType = getZoneType(sketch);
  const metricToZoneType = (sketchMetric: Metric) => {
    return sketchToZoneType[sketchMetric.sketchId!];
  };

  const groupMetrics = await overlapRasterGroupMetrics({
    metricId: metricGroup.metricId,
    groupIds: protectionLevels,
    sketch,
    metricToGroup: metricToZoneType,
    metrics: metrics,
    featuresByClass,
  });

  return {
    metrics: sortMetrics(rekeyMetrics([...metrics, ...groupMetrics])),
    sketch: toNullSketch(sketch, true),
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
      const zoneType = getUserAttribute(
        sketch.properties,
        "zoneType",
        ""
      ).toString();
      types[sketch.properties.id] = zoneType;
      return types;
    },
    {}
  );
  return zoneTypes;
}

export default new GeoprocessingHandler(fishingValueOverlap, {
  title: "fishingValueOverlap",
  description: "OUS fishing value overlap",
  timeout: 520, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  memory: 10240,
});
