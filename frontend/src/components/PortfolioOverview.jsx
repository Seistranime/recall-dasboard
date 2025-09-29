import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PortfolioOverview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:5000/api/portfolio").then(res => setData(res.data));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="bg-white shadow p-4 rounded-xl">
      <h2 className="text-lg font-bold mb-4">Portfolio Overview</h2>
      <p>Total: ${data.totalUSD}</p>
      <h3 className="font-semibold mt-2">Breakdown per Chain</h3>
      <ul>{Object.entries(data.breakdownChain).map(([k,v]) => <li key={k}>{k}: ${v}</li>)}</ul>
      <h3 className="font-semibold mt-2">Breakdown per Token</h3>
      <ul>{Object.entries(data.breakdownToken).map(([k,v]) => <li key={k}>{k}: ${v}</li>)}</ul>
      <p className="mt-2">PnL: {data.pnl.percent}% (${data.pnl.usd})</p>
    </div>
  );
}
