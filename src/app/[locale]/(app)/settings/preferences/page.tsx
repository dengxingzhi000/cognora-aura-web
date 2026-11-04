import { PageHeader } from "@/components/ui/page-header";
import { SystemSettings } from "@/features/settings";

export default function PreferencesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="系统设置"
        title="系统设置"
        description="平台级参数与字典，以及当前租户的基础信息和配置项。"
      />
      <SystemSettings />
    </div>
  );
}
