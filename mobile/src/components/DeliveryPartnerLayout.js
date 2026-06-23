import React from "react";
import DeliveryScreenShell from "@/src/components/delivery/DeliveryScreenShell";
import { SupplierPageHeader } from "@/src/components/supplier/supplierUi";

export default function DeliveryPartnerLayout({
  title,
  subtitle = "",
  icon = "bicycle-outline",
  children,
  stats = [],
  showBack = true,
  showMenu = true,
}) {
  const headerExtra = (
    <SupplierPageHeader icon={icon} title={title} subtitle={subtitle} stats={stats} />
  );

  return (
    <DeliveryScreenShell showBack={showBack} showMenu={showMenu} headerExtra={headerExtra}>
      {children}
    </DeliveryScreenShell>
  );
}
