import { findMinBoundingRect } from "./minBoundingRectangle";
import { polygon } from "@turf/helpers";
import distance from "@turf/distance";
import {
  Sketch,
  Polygon,
  SketchCollection,
  toSketchArray,
} from "@seasketch/geoprocessing";

// min-bounding-rectangle uses this 'Point' type definition
type Point = [number, number];

export const getMinWidth = (
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
) => {
  const sketches = Array.isArray(sketch) ? sketch : toSketchArray(sketch);

  const result = sketches.map((curSketch) => {
    const coords: number[][] = curSketch.geometry.coordinates[0];

    let points: Point[] = [];
    coords.forEach((coord, index) => {
      points[index] = [coord[0], coord[1]];
    });

    const mbrPoints = findMinBoundingRect(points);

    const mbrPoly = polygon([mbrPoints]);

    const mbrCoords = mbrPoly.geometry.coordinates[0];

    // find distance along two sides of the mbr
    const distanceA = distance(mbrCoords[0], mbrCoords[1], { units: "meters" });
    const distanceB = distance(mbrCoords[1], mbrCoords[2], { units: "meters" });

    const minWidth = Math.min(distanceA, distanceB);

    return {
      sketchId: curSketch.properties.id,
      sketchName: curSketch.properties.name,
      value: minWidth,
    };
  });
  return result;
};
