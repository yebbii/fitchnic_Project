"use client";

import { useCrm } from "@/hooks/use-crm-store";
import DesignerCalendarTab from "./designer-calendar-tab";
import DesignerTimelineTab from "./designer-timeline-tab";
import WorklogTab from "./worklog-tab";

export default function DesignerContainer() {
  const { state } = useCrm();

  return (
    <div>
      {state.designerTab === "calendar" && <DesignerCalendarTab />}
      {state.designerTab === "timeline" && <DesignerTimelineTab />}
      {state.designerTab === "worklog" && <WorklogTab />}
    </div>
  );
}
