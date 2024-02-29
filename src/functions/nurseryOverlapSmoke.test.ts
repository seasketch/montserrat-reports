/**
 * @jest-environment node
 * @group smoke
 */
import { nurseryOverlap } from "./nurseryOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof nurseryOverlap).toBe("function");
  });
  test("nurseryOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await nurseryOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "nurseryOverlap", example.properties.name);
    }
  }, 120000);
});
