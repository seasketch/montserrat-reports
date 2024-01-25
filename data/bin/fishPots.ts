import {
  Metric,
  Polygon,
  FeatureCollection,
  createMetric,
} from "@seasketch/geoprocessing";
import fs from "fs-extra";
import project from "../../project";

const metricGroup = project.getMetricGroup("fishPotsOverlap");
const speciesClass = metricGroup.classes;

if (!speciesClass) throw new Error("Problem accessing fish pot data");

const datasources = speciesClass.map((species) =>
  project.getDatasourceById(species.datasourceId!)
);
const urls = datasources.map((ds) => `data/dist/${ds.datasourceId}.json`);

const features = urls.map((url, index) => {
  const feature = JSON.parse(
    fs.readFileSync(url).toString()
  ) as FeatureCollection<Polygon>;
  const species: string = speciesClass[index].classId; // replace this with how you derive species from url or index
  return { feature, species };
});

async function main() {
  const sumPoints = features.reduce<Record<string, number>>(
    (acc, { feature, species }) => {
      acc[species] = feature.features.length;
      return acc;
    },
    {}
  );

  const metrics: Metric[] = ( // calculate area overlap metrics for each class
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        return [
          createMetric({
            classId: curClass.classId,
            value: sumPoints[curClass.classId],
            metricId: metricGroup.metricId,
          }),
        ];
      })
    )
  ).reduce(
    // merge
    (metricsSoFar, curClassMetrics) => [...metricsSoFar, ...curClassMetrics],
    []
  );

  fs.writeFile(
    "data/bin/fishPots.json",
    JSON.stringify({ metrics }, null, 2),
    (err) =>
      err
        ? console.error("Error", err)
        : console.info(`Successfully wrote fishPots.json`)
  );
}

main();
