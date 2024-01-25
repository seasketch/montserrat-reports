/**
 * @jest-environment node
 * @group smoke
 */
import { minWidth } from "./minWidth";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof minWidth).toBe("function");
  });
  test("minWidthSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await minWidth(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "minWidth", example.properties.name);
    }
  }, 120000);
});
