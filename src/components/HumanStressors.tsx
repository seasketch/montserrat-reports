import React from "react";
import {
  Collapse,
  ResultsCard,
  useSketchProperties,
  DataDownload,
  ToolbarCard,
} from "@seasketch/geoprocessing/client-ui";
import { ReportResult, GeogProp } from "@seasketch/geoprocessing/client-core";
import project from "../../project";
import Translator from "./TranslatorAsync";
import { Trans, useTranslation } from "react-i18next";
import {
  genSketchTable,
  groupedCollectionReport,
  groupedSketchReport,
} from "../util/ProtectionLevelOverlapReports";
import { Download } from "@styled-icons/bootstrap/Download/Download";

export const HumanStressors: React.FunctionComponent<GeogProp> = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();

  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });

  const mg = project.getMetricGroup("humanStressorsAreaOverlap", t);
  const precalcMetrics = project.getPrecalcMetrics(
    mg,
    "area",
    curGeography.geographyId
  );

  return (
    <>
      <ResultsCard
        title={t("Human Use")}
        functionName="humanStressorsAreaOverlap"
        useChildCard
      >
        {(data: ReportResult) => {
          return (
            <ToolbarCard
              title={t("Human Use")}
              items={
                <DataDownload
                  filename="human-use"
                  data={data.metrics}
                  formats={["csv", "json"]}
                  titleElement={
                    <Download
                      size={18}
                      color="#999"
                      style={{ cursor: "pointer" }}
                    />
                  }
                />
              }
            >
              <p>
                <Trans i18nKey="Human Stressors Card 1">
                  This report summarizes the amount of human use sectors that
                  overlap with this plan. Plans should consider the potential
                  impact to sectors if access or activities are restricted.
                </Trans>
              </p>
              <Translator>
                {isCollection
                  ? groupedCollectionReport(data, precalcMetrics, mg, t)
                  : groupedSketchReport(data, precalcMetrics, mg, t)}

                {isCollection && (
                  <Collapse title={t("Show by MPA")}>
                    {genSketchTable(data, precalcMetrics, mg)}
                  </Collapse>
                )}
              </Translator>

              <Collapse title={t("Learn more")}>
                <Trans i18nKey="Human Stressors Card - learn more">
                  <p>
                    ℹ️ Overview: Plans should consider how these areas of human
                    use and human stress should be navigated in the ocean plan.
                  </p>
                  <p>
                    🎯 Planning Objective: No specific planning objectives for
                    human use areas.
                  </p>
                  <p>🗺️ Source Data: 2020</p>
                  <p>
                    📈 Report: The total area of the plan was calculated, along
                    with the total area under high protection and total area
                    under medium protection. Overlap was only counted once, and
                    if zones of different protection levels overlap, only the
                    highest protection level is counted.
                  </p>
                </Trans>
              </Collapse>
            </ToolbarCard>
          );
        }}
      </ResultsCard>
    </>
  );
};
