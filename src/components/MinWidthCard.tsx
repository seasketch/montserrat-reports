import React from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  Collapse,
  ObjectiveStatus,
  ResultsCard,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
// Import the results type definition from function
import { MinWidthResult } from "../functions/minWidth";
import minWidthExample from "../assets/min_width_example.png";

const Number = new Intl.NumberFormat("en", { style: "decimal" });

export const MinWidthCard = () => {
  const { t } = useTranslation();
  const minWidthDescription = t(
    "Marine Reserve Zones should have a minimum width of at least 1 kilometer to meet conservation goals."
  );
  return (
    <>
      <ResultsCard
        title={t("Minimum Size Goal", "Minimum Size Goal")}
        functionName="minWidth"
      >
        {(data: MinWidthResult[]) => {
          return (
            <>
              {data.length > 1 ? (
                <div>
                  <p>{minWidthDescription}</p>
                  The zones within this plan have the following minimum widths:
                  <VerticalSpacer />
                  {data.map((result, index) => (
                    <div key={index}>
                      <ObjectiveStatus
                        key={index}
                        status={result.value >= 1000 ? "yes" : "no"}
                        msg={
                          <span>
                            {result.sketchName}:{" "}
                            <b>{(result.value * 1e-3).toFixed(2)}km</b>
                          </span>
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p>{minWidthDescription}</p>
                  {/* <br /> */}
                  <ObjectiveStatus
                    key={data[0].sketchId}
                    status={data[0].value >= 1000 ? "yes" : "no"}
                    msg={
                      <span>
                        This zone's minimum width is:{" "}
                        <b>{(data[0].value * 1e-3).toFixed(2)}km</b>
                      </span>
                    }
                  />
                </div>
              )}
              <Collapse title={t("Learn more")}>
                <Trans i18nKey="Minimum Width Card - learn more">
                  <div>
                    <img
                      src={minWidthExample}
                      alt="Minimum Width Image"
                      style={{ display: "block", marginLeft: "80px" }}
                    />
                    <br />
                    Minimum width is approximated by finding the minimum width
                    of the smallest bounding rectangle of each sketch as
                    visualized in the image above.
                  </div>
                </Trans>
              </Collapse>
            </>
          );
        }}
      </ResultsCard>
    </>
  );
};
