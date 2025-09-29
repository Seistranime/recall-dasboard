import React, { useEffect, useState } from "react";
import axios from "axios";

export default function TradeHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/api/history").then(res => setHistory(res.data));
  }, []);

  return (
    <div className="bg-white shadow p-4 rounded-xl overflow-x-auto">
      <h2 className="text-lg font-bold mb-4">Trade History</h2>
      <table className="w-full text-left border">
        <thead>
          <tr>
            <th className="p-2 border">Time</th>
            <th className="p-2 border">Pair</th>
            <th className="p-2 border">Side</th>
            <th className="p-2 border">Amount</th>
            <th className="p-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h,i) => (
            <tr key={i}>
              <td className="p-2 border">{h.time}</td>
              <td className="p-2 border">{h.pair}</td>
              <td className="p-2 border">{h.side}</td>
              <td className="p-2 border">{h.amount}</td>
              <td className="p-2 border">{h.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
