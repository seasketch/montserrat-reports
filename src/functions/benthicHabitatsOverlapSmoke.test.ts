/**
 * @jest-environment node
 * @group smoke
 */
import { benthicHabitatsOverlap } from "./benthicHabitatsOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof benthicHabitatsOverlap).toBe("function");
  });
  test("benthicHabitatsOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await benthicHabitatsOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(
        result,
        "benthicHabitatsOverlap",
        example.properties.name
      );
    }
  }, 120000);
});
