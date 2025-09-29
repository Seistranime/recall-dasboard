import React, { useState } from "react";
import axios from "axios";

export default function ManualTradePanel() {
  const [form, setForm] = useState({
    fromChain: "EVM",
    toChain: "SVM",
    fromToken: "ETH",
    toToken: "USDC",
    amount: "",
    side: "Buy",
    reason: ""
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/trade", form);
      alert("Trade executed: " + JSON.stringify(res.data));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="bg-white shadow p-4 rounded-xl">
      <h2 className="text-lg font-bold mb-4">Manual Trade</h2>
      <div className="grid grid-cols-2 gap-4">
        <select name="fromChain" onChange={handleChange} className="p-2 border rounded">
          <option>EVM</option>
          <option>SVM</option>
        </select>
        <select name="toChain" onChange={handleChange} className="p-2 border rounded">
          <option>EVM</option>
          <option>SVM</option>
        </select>
        <input type="text" name="fromToken" placeholder="From Token" className="p-2 border rounded" onChange={handleChange} />
        <input type="text" name="toToken" placeholder="To Token" className="p-2 border rounded" onChange={handleChange} />
        <input type="number" name="amount" placeholder="Amount" className="p-2 border rounded" onChange={handleChange} />
        <select name="side" onChange={handleChange} className="p-2 border rounded">
          <option>Buy</option>
          <option>Sell</option>
        </select>
        <input type="text" name="reason" placeholder="Reason (optional)" className="col-span-2 p-2 border rounded" onChange={handleChange} />
      </div>
      <button onClick={handleSubmit} className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
        Execute Trade
      </button>
    </div>
  );
}
