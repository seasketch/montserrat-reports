/**
 * @jest-environment node
 * @group smoke
 */
import { divingValueOverlap } from "./divingValueOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof divingValueOverlap).toBe("function");
  });
  test("divingValueOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await divingValueOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "divingValueOverlap", example.properties.name);
    }
  }, 120000);
});
