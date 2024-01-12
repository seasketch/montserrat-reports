import {
  NullSketch,
  NullSketchCollection,
  Sketch,
  SketchCollection,
  getSketchFeatures,
  getUserAttribute,
} from "@seasketch/geoprocessing";

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
