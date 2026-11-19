import type { ReactNode } from "react";
import { getDeanAccount } from "./account";
import DeanWorkspace from "./workspace";
import { getDeanRecentActivity } from "./recent-activity";

export default async function DeanLayout({ children }: { children: ReactNode }) {
  const [account, activity] = await Promise.all([getDeanAccount(), getDeanRecentActivity()]);
  return <DeanWorkspace name={account.details.fullName} activity={activity}>{children}</DeanWorkspace>;
}
