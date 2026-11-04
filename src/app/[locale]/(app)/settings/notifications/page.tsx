import { PageHeader } from "@/components/ui/page-header";
import { NotificationPreferencePanel } from "@/features/profile";

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="个人中心"
        title="通知偏好"
        description="按通知类型与投递渠道控制是否接收提醒。"
      />
      <NotificationPreferencePanel />
    </div>
  );
}
