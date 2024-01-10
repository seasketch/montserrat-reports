/**
 * @jest-environment node
 * @group smoke
 */
import { fishingValueOverlap } from "./fishingValueOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof fishingValueOverlap).toBe("function");
  });
  test("fishingValueOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await fishingValueOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(
        result,
        "fishingValueOverlap",
        example.properties.name
      );
    }
  }, 120000);
});
