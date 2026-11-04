import { PageHeader } from "@/components/ui/page-header";
import { SecuritySettings } from "@/features/profile";

export default function SecurityPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="个人中心"
        title="账号安全"
        description="修改登录密码，查看并管理已绑定的通行密钥。"
      />
      <SecuritySettings />
    </div>
  );
}
