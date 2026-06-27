import React from "react";
import { ExternalLink } from "lucide-react";

export function ScreenerLink({ symbol = "", company = "", exchange = "", children, className = "screener-company-link" }) {
  const label = children || company || symbol || "Company";
  return (
    <a className={className} href={screenerUrl(symbol, company, exchange)} target="_blank" rel="noreferrer" title={`Open ${company || symbol} on Screener`}>
      {label}
      <ExternalLink size={12} />
    </a>
  );
}

export function screenerUrl(symbol = "", company = "", exchange = "") {
  const cleanSymbol = String(symbol || "").trim().replace(/^BSE:/i, "").toUpperCase();
  const cleanExchange = String(exchange || "").trim().toUpperCase();
  if (cleanSymbol && cleanExchange !== "MUTF_IN" && /^[A-Z0-9-]+$/.test(cleanSymbol)) {
    return `https://www.screener.in/company/${encodeURIComponent(cleanSymbol)}/`;
  }
  return `https://www.screener.in/company/?q=${encodeURIComponent(company || cleanSymbol)}`;
}
