import { useEffect, useState } from "react";
import { api } from "../server/frontendApi";
import "../index.css";

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/data")
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center mt-10 text-white">Loading...</div>;
  }

  const account = data.find(d => d.type === "accountDetails")?.account;
  const signal = data.find(d => d.type === "signal")?.signal;
  const news = data.find(d => d.type === "news")?.news;
  const timezone = data.find(d => d.type === "timezone")?.timezone;

  if (!account || !signal || !news) {
    return <div className="text-center mt-10 text-white">No data available</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Trading Dashboard</h1>
        <span className="text-gray-400">{timezone}</span>
      </div>

      <div className="bg-gray-800 p-4 rounded-xl">
        <p>ID: {account.accountID}</p>
        <p>Balance: ${account.balance}</p>
        <p>Money at Risk: ${account.moneyAtRisk}</p>
      </div>

      <div className="bg-gray-800 p-4 rounded-xl">
        <h2 className="font-semibold">Daily Signal</h2>
        <div className={`p-3 mt-2 rounded-lg text-center ${
          signal.potential === "buy" ? "bg-green-600" :
          signal.potential === "sell" ? "bg-red-600" : "bg-gray-600"
        }`}>
          {signal.potential.toUpperCase()}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-xl">
        <h2 className="font-semibold">News</h2>
        {news.warnTimes.length > 0 ? (
          <ul>
            {news.warnTimes.map(t => (
              <li key={t} className="text-yellow-400">⚠ {t}</li>
            ))}
          </ul>
        ) : (
          <p className="text-green-400">No high impact news</p>
        )}
      </div>
    </div>
  );
}
