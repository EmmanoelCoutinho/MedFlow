import React from "react";
import {
  ActivityIcon,
  Clock3Icon,
  TimerOffIcon,
  UsersIcon,
} from "lucide-react";
import type { ContactMetrics } from "../../modules/contacts/types/contacts";

const metricItems = [
  {
    key: "total",
    label: "Total de clientes",
    icon: UsersIcon,
  },
  {
    key: "active",
    label: "Clientes ativos",
    icon: ActivityIcon,
  },
  {
    key: "inactive7Days",
    label: "Sem contato há 7 dias",
    icon: Clock3Icon,
  },
  {
    key: "inactive30Days",
    label: "Sem contato há 30 dias",
    icon: TimerOffIcon,
  },
] as const;

type ContactDashboardProps = {
  metrics: ContactMetrics;
  loading?: boolean;
};

export const ContactDashboard: React.FC<ContactDashboardProps> = ({
  metrics,
  loading,
}) => {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metricItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">{item.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0A84FF]">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-950">
              {loading ? "..." : metrics[item.key]}
            </p>
          </div>
        );
      })}
    </section>
  );
};
