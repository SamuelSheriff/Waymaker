import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/goals")({ component: GoalsLayout });

function GoalsLayout() {
  return <Outlet />;
}
