import React from "react";

export default function PerformanceStats() {
  return (
    <div className="bg-white shadow p-4 rounded-xl">
      <h2 className="text-lg font-bold mb-4">Performance & Statistik</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-2">Win Rate: 65%</div>
        <div className="p-2">Avg ROI: 8%</div>
        <div className="p-2">Total Volume: $150k</div>
        <div className="p-2">Trades: 120</div>
      </div>
    </div>
  );
}
