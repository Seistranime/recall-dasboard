import React from "react";
import ManualTradePanel from "../components/ManualTradePanel";
import PortfolioOverview from "../components/PortfolioOverview";
import PerformanceStats from "../components/PerformanceStats";
import TradeHistory from "../components/TradeHistory";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold mb-6">Recall Agent Trading</h1>
        <nav className="space-y-3">
          <a href="#" className="block">Dashboard</a>
          <a href="#" className="block">Manual Trade</a>
          <a href="#" className="block">Portfolio</a>
          <a href="#" className="block">Trade History</a>
          <a href="#" className="block">Settings</a>
        </nav>
      </aside>
      <main className="flex-1 p-6 space-y-6">
        <PerformanceStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ManualTradePanel />
          <TradeHistory />
        </div>
        <PortfolioOverview />
      </main>
    </div>
  );
}
