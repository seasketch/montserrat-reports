import {
  Sketch,
  SketchCollection,
  GeoprocessingHandler,
} from "@seasketch/geoprocessing";
import { Polygon } from "@turf/helpers";
import { getMinWidth } from "../../scripts/getMinWidth";

/** Optional caller-provided parameters */
interface GeoprocessingParams {
  /** IDs of one or more sub-regions to operate on */
  geographies?: string[];
}

export interface MinWidthResult {
  sketchId: any;
  sketchName: string;
  value: number;
}

export async function minWidth(
  sketch: Sketch | SketchCollection,
  extraParams: GeoprocessingParams = {}
): Promise<MinWidthResult[]> {
  return getMinWidth(sketch as Sketch<Polygon>);
}

export default new GeoprocessingHandler(minWidth, {
  title: "minWidth",
  description: "Function description",
  timeout: 600, // seconds
  memory: 256, // megabytes
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
});
