/**
 * @jest-environment node
 * @group smoke
 */
import { fishPotsOverlap } from "./fishPotsOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof fishPotsOverlap).toBe("function");
  });
  test("fishPotsOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await fishPotsOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "fishPotsOverlap", example.properties.name);
    }
  }, 120000);
});
