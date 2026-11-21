import type { ReactNode } from "react";
import RouteRefresh from "@/components/route-refresh";
import { getDeanAccount } from "./account";
import DeanWorkspace from "./workspace";
import { getDeanRecentActivity } from "./recent-activity";

export default async function DeanLayout({ children }: { children: ReactNode }) {
  const [account, activity] = await Promise.all([getDeanAccount(), getDeanRecentActivity()]);
  return <DeanWorkspace name={account.details.fullName} activity={activity}><RouteRefresh intervalMs={10000} />{children}</DeanWorkspace>;
}
