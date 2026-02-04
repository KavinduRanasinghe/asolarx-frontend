import React, { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import axios from "axios";
import "./App.css";

const API_BASE_URL = "https://kavindu2001-asolarx-backend.hf.space";

function App() {
  const [token, setToken] = useState(localStorage.getItem("solar_token"));
  const [systemData, setSystemData] = useState(null);
  const [error, setError] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, { username, password });
      const newToken = response.data.access_token;
      setToken(newToken);
      localStorage.setItem("solar_token", newToken);
      setLoginError("");
    } catch (err) {
      setLoginError("Invalid Credentials");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setSystemData(null);
    localStorage.removeItem("solar_token");
  };

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [statusRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/status`, config),
        axios.get(`${API_BASE_URL}/api/history`, config)
      ]);
      setSystemData(statusRes.data);
      setHistoryData(historyRes.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
      else setError("System Offline - Check Backend");
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>A-SOLARX</h1>
          <form onSubmit={handleLogin}>
            <div className="input-group"><input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} /></div>
            <div className="input-group"><input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} /></div>
            {loginError && <div className="error-msg">{loginError}</div>}
            <button type="submit" className="login-btn">ACCESS DASHBOARD</button>
          </form>
        </div>
      </div>
    );
  }

  if (!systemData && !error) return <div className="loading-screen">Connecting to A-SolarX AI...</div>;

  return (
    <div className="dashboard-container">
      <header>
        <div className="header-left">
          <h1>A-SOLARX</h1>
          <div className="subtitle">Adaptive & Explainable Energy Management Framework</div>
        </div>
        <div className="header-right">
          <div className="datetime-block">
            <div className="date-text">{currentDate.toLocaleDateString()}</div>
            <div className="time-text">{currentDate.toLocaleTimeString()}</div>
          </div>
          <button onClick={handleLogout} className="logout-btn">LOGOUT</button>
        </div>
      </header>

      {error ? (
        <div className="error-screen">{error}</div>
      ) : (
        <div className="main-grid">
          <div className="left-panel">
            <section className={`status-card status-${systemData.plan}`}>
              <span className="status-label">Active Power Plan</span>
              <div className="status-value">{systemData.plan}</div>
            </section>
            <section className="xai-card">
              <h3>🤖 AI Reasoning (XAI)</h3>
              <p className="explanation-text">"{systemData.explanation}"</p>
              <div className="feature-highlight">
                <span className="feature-label">Primary Factor:</span>
                <span className="feature-value">{systemData.top_feature}</span>
              </div>
            </section>
          </div>

          <div className="right-panel">
            <section className="metrics-grid">
              <MetricCard label="Battery" value={`${systemData.metrics.Battery_V} V`} icon="⚡" />
              <MetricCard label="Humidity" value={`${systemData.metrics.Weather_Humidity}%`} icon="💧" />
              <MetricCard label="Clouds" value={`${systemData.metrics.Weather_Clouds}%`} icon="☁️" />
              <MetricCard label="Temp" value={`${systemData.metrics.Weather_Temp_C}°C`} icon="🌡️" />
            </section>

            <div className="chart-container" style={{ height: "350px", background: "#1e293b", padding: "1rem", borderRadius: "1rem" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                  <Legend />
                  <Line type="monotone" dataKey="humidity" stroke="#3b82f6" name="Humidity (%)" dot={false} />
                  <Line type="monotone" dataKey="solar" stroke="#eab308" name="Solar (V)" dot={false} />
                  <Line type="monotone" dataKey="temp" stroke="#ef4444" name="Temp (°C)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MetricCard = ({ label, value, icon }) => (
  <div className="metric-card">
    <div className="icon">{icon}</div>
    <div className="metric-info"><span className="metric-label">{label}</span><span className="metric-val">{value}</span></div>
  </div>
);

export default App;