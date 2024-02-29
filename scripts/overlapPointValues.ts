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

  const sketches = Array.isArray(sketch) ? sketch : toSketchArray(sketch);

  const sketchId = (
    isSketchCollection(sketch)
      ? sketch.properties.id
      : sketches[0].properties.id
  ).toString();

  const sketchName = isSketchCollection(sketch)
    ? sketch.properties.name
    : sketches[0].properties.name;

  if (sketches.length === 0) {
    return [
      createMetric({
        metricId,
        sketchId: sketchId,
        value: 0,
        extra: {
          sketchName: sketchName,
          minValue: 0,
          maxValue: 0,
        },
      }),
    ];
  }

  const sketchColl = flatten(featureCollection(sketches));

  // If sketch overlap, use union
  const sketchUnion = clip(sketchColl, "union");
  if (!sketchUnion)
    throw new Error("overlapPointValues - something went wrong");

  const overlapValues = doIntersect(
    sketchUnion,
    features as Feature<Point>[],
    newOptions
  );

  const metrics = createMetric({
    metricId,
    sketchId: sketchId,
    value: overlapValues.mean,
    extra: {
      sketchName: sketchName,
      minValue: overlapValues.min,
      maxValue: overlapValues.max,
    },
  });

  return [metrics];
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
