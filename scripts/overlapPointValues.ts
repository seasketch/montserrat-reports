import {
  Sketch,
  SketchCollection,
  Polygon,
  Feature,
  Metric,
  toSketchArray,
  isSketchCollection,
  chunk,
  clip,
  createMetric,
} from "@seasketch/geoprocessing";
import { featureCollection, MultiPolygon, Point } from "@turf/helpers";
import { featureEach } from "@turf/meta";
import area from "@turf/area";
import flatten from "@turf/flatten";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

interface OverlapPointOptions {
  /** Intersection calls are chunked to avoid infinite loop error, defaults to 5000 features */
  chunkSize: number;
  /** If sketch collection, will include its child sketch metrics in addition to collection metrics, defaults to true */
  includeChildMetrics?: boolean;
  sumProperty?: string;
}

/**
 * Calculates overlap between sketch(es) and an array of point features.
 * If sketch collection includes overall and per sketch
 */
export async function overlapPointValues(
  metricId: string,
  /** features to intersect and get overlap stats */
  features: Feature<Point>[],
  /** the sketches.  If empty will return 0 result. */
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>
    | Sketch<Polygon | MultiPolygon>[],
  options?: Partial<OverlapPointOptions>
): Promise<Metric[]> {
  const newOptions: OverlapPointOptions = {
    includeChildMetrics: true,
    chunkSize: 5000,
    ...(options || {}),
  };
  const { includeChildMetrics } = newOptions;
  let meanValue: number = 0;
  let minValue: number = 0;
  let minValueList: number[] = [];
  let maxValueList: number[] = [];
  let maxValue: number = 0;
  let isOverlap = false;
  const sketches = Array.isArray(sketch) ? sketch : toSketchArray(sketch);

  if (sketches.length > 0) {
    const sketchColl = flatten(featureCollection(sketches));
    const sketchArea = area(sketchColl);

    // If sketch overlap, use union
    const sketchUnion = clip(sketchColl, "union");
    if (!sketchUnion) throw new Error("overlapFeatures - something went wrong");
    const sketchUnionArea = area(sketchUnion);
    isOverlap = sketchUnionArea < sketchArea;

    const finalSketches =
      sketches.length > 1 && isOverlap ? flatten(sketchUnion) : sketchColl;

    if (isOverlap) {
      featureEach(finalSketches, (feat) => {
        const curValues = doIntersect(
          feat,
          features as Feature<Point>[],
          newOptions
        );
        meanValue += curValues.mean;
        minValueList.push(curValues.min);
        maxValueList.push(curValues.max);
      });
      meanValue = meanValue / finalSketches.features.length;
      minValue = Math.min(...minValueList);
      maxValue = Math.max(...maxValueList);
    }
  }

  let sketchMetrics: Metric[] = sketches.map((curSketch) => {
    let sketchValue = doIntersect(
      curSketch as Feature<Polygon | MultiPolygon>,
      features as Feature<Point>[],
      newOptions
    );
    return createMetric({
      metricId,
      sketchId: curSketch.properties.id,
      value: sketchValue.mean,
      extra: {
        sketchName: curSketch.properties.name,
        minValue: sketchValue.min,
        maxValue: sketchValue.max,
      },
    });
  });

  if (!isOverlap) {
    meanValue = sketchMetrics.reduce((sumSoFar, sm) => sumSoFar + sm.value, 0);
    meanValue = meanValue / sketches.length;

    const allMinValues = sketchMetrics.map((sm) =>
      sm.extra && typeof sm.extra.minValue == "number" ? sm.extra.minValue : 0
    );
    minValue = Math.min(...allMinValues);

    const allMaxValues = sketchMetrics.map((sm) =>
      sm.extra && typeof sm.extra.minValue == "number" ? sm.extra.minValue : 0
    );
    maxValue = Math.min(...allMaxValues);
  }

  const collMetrics: Metric[] = (() => {
    if (isSketchCollection(sketch)) {
      // Push collection with accumulated meanValue
      return [
        createMetric({
          metricId,
          sketchId: sketch.properties.id,
          value: meanValue,
          extra: {
            sketchName: sketch.properties.name,
            isCollection: true,
          },
        }),
      ];
    } else {
      return [];
    }
  })();

  return [...(includeChildMetrics ? sketchMetrics : []), ...collMetrics];
}

// invokes corresponding intersect function based on type of intersect
const doIntersect = (
  featureA: Feature<Polygon | MultiPolygon>,
  featuresB: Feature<Point>[],
  options: OverlapPointOptions
) => {
  const { chunkSize } = options;
  return getSketchPointIntersectValues(featureA, featuresB, chunkSize);
};

const getSketchPointIntersectValues = (
  featureA: Feature<Polygon | MultiPolygon>,
  featuresB: Feature<Point>[],
  chunkSize: number
) => {
  // chunk to avoid blowing up intersect
  const chunks = chunk(featuresB, chunkSize || 5000);

  const pointOverlaps = featuresB.filter((point) =>
    booleanPointInPolygon(point.geometry.coordinates, featureA)
  );

  if (pointOverlaps.length === 0)
    return {
      mean: 0,
      min: 0,
      max: 0,
    };

  const propValues = pointOverlaps.map((point) => {
    return point.properties!.juvenile_fish_abundance;
  });

  const sum = propValues.reduce((sumSoFar, curValue) => sumSoFar + curValue, 0);
  const mean = sum / pointOverlaps.length;
  const min = Math.min(...propValues);
  const max = Math.max(...propValues);

  const overlapValues = {
    mean: mean,
    min: min,
    max: max,
  };

  return overlapValues;
};
