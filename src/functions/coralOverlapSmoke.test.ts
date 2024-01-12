/**
 * @jest-environment node
 * @group smoke
 */
import { coralOverlap } from "./coralOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof coralOverlap).toBe("function");
  });
  test("coralOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await coralOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "coralOverlap", example.properties.name);
    }
  }, 120000);
});
