document.getElementById("tradeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    fromChain: document.getElementById("fromChain").value,
    fromSpecific: document.getElementById("fromSpecific").value,
    toChain: document.getElementById("toChain").value,
    toSpecific: document.getElementById("toSpecific").value,
    action: document.getElementById("action").value,
    fromToken: document.getElementById("fromToken").value,
    toToken: document.getElementById("toToken").value,
    amount: document.getElementById("amount").value,
    reason: document.getElementById("reason").value
  };
  const res = await fetch("/api/trade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (result.success) loadPortfolio();
});

async function loadPortfolio() {
  const res = await fetch("/api/portfolio");
  const result = await res.json();
  if (result.success) {
    const tbody = document.querySelector("#portfolioTable tbody");
    tbody.innerHTML = "";
    result.portfolio.forEach(trade => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(trade.timestamp).toLocaleString()}</td>
        <td>${trade.action}</td>
        <td>${trade.fromSpecific} (${trade.fromChain})</td>
        <td>${trade.toSpecific} (${trade.toChain})</td>
        <td>${trade.amount} ${trade.toToken}</td>
        <td>${trade.reason || ""}</td>
      `;
      tbody.appendChild(row);
    });
  }
}
loadPortfolio();
