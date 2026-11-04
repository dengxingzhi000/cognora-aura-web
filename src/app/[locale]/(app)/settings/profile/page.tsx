import { PageHeader } from "@/components/ui/page-header";
import { ProfileOverview } from "@/features/profile";

export default function ProfilePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="个人中心"
        title="个人资料"
        description="查看当前账号的姓名、部门与联系方式，并管理账号安全和通知偏好。"
      />
      <ProfileOverview />
    </div>
  );
}
