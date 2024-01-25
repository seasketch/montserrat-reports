/**
 * @jest-environment node
 * @group smoke
 */
import { priorityAreasOverlap } from "./priorityAreasOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof priorityAreasOverlap).toBe("function");
  });
  test("priorityAreasOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await priorityAreasOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(
        result,
        "priorityAreasOverlap",
        example.properties.name
      );
    }
  }, 120000);
});
