import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { SegmentControl, ReportPage } from "@seasketch/geoprocessing/client-ui";
import { OverviewPage } from "../components/OverviewPage";
import Translator from "../components/TranslatorAsync";
import { EnvironmentPage } from "../components/EnvironmentPage";

const enableAllTabs = false;
const TabReport = () => {
  const { t } = useTranslation();
  const viabilityId = "viability";
  const environmentId = "environment";
  const segments = [
    { id: viabilityId, label: t("Viability") },
    { id: environmentId, label: t("Environment") },
  ];
  const [tab, setTab] = useState<string>(viabilityId);

  return (
    <>
      <div style={{ marginTop: 5 }}>
        <SegmentControl
          value={tab}
          onClick={(segment) => setTab(segment)}
          segments={segments}
        />
      </div>
      <ReportPage hidden={!enableAllTabs && tab === viabilityId}>
        <OverviewPage />
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab === environmentId}>
        <EnvironmentPage />
      </ReportPage>
    </>
  );
};

export default function () {
  // Translator must be in parent FunctionComponent to have access to useTranslate hook
  return (
    <Translator>
      <TabReport />
    </Translator>
  );
}
