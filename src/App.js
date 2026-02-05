import React, { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import axios from "axios";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:5000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("solar_token"));
  const [systemData, setSystemData] = useState(null);
  const [error, setError] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  // --- NEW STATE FOR MODEL ACCURACY & TRAINING ---
  const [isTraining, setIsTraining] = useState(false);
const [modelAccuracy, setModelAccuracy] = useState(
  localStorage.getItem("solar_accuracy") || "N/A"
);
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = useCallback(() => {
    setToken(null);
    setSystemData(null);
    localStorage.removeItem("solar_token");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, { username, password });
      const newToken = response.data.access_token;
      localStorage.setItem("solar_token", newToken);
      setToken(newToken);
      setUsername("");
      setPassword("");
    } catch (err) {
      setLoginError("Invalid Credentials");
    }
  };

  const fetchData = useCallback(async () => {
    const activeToken = localStorage.getItem("solar_token");
    if (!activeToken) return;

    try {
      const config = { headers: { Authorization: `Bearer ${activeToken}` } };
      const [statusRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/status`, config),
        axios.get(`${API_BASE_URL}/api/history`, config)
      ]);
      
      const history = historyRes.data;
      setHistoryData(history); 

      if (history && history.length > 0) {
        const latest = history[history.length - 1];
        
        setSystemData({
          ...statusRes.data,
          metrics: {
            Battery_V: statusRes.data.metrics?.Battery_V ?? latest.Battery_V,
            Solar_V: statusRes.data.metrics?.Solar_V ?? latest.Solar_V,
            Weather_Temp_C: statusRes.data.metrics?.Weather_Temp_C ?? latest.Weather_Temp_C,
            Weather_Humidity: statusRes.data.metrics?.Weather_Humidity ?? latest.Weather_Humidity,
            Weather_Clouds: statusRes.data.metrics?.Weather_Clouds ?? latest.Weather_Clouds,
          },
          // Model version from backend
          model_version: statusRes.data.model_version || "asolarx_latest.pkl"
        });
      }
      setError(null);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 422) {
        handleLogout();
      } else {
        setError("System Offline - Check Backend Connection");
      }
    }
  }, [handleLogout]);

 const handleTrainModel = async () => {
  const activeToken = localStorage.getItem("solar_token");
  if (!activeToken) return;
  
  setIsTraining(true);
  try {
    const config = { headers: { Authorization: `Bearer ${activeToken}` } };
    
    // The 'response' object contains 'data', which is your Flask JSON
    const response = await axios.post(`${API_BASE_URL}/api/train`, {}, config);
    
    // Extract accuracy and model_file from the response
    const { accuracy, model_file, msg } = response.data; 

    // Update your React state
    setModelAccuracy(accuracy); 
    
    // Optional: Persist it so it stays after a page refresh
    localStorage.setItem("solar_accuracy", accuracy);

    alert(`${msg}\nModel: ${model_file}\nAccuracy: ${accuracy}`);
    
    fetchData(); // Refresh the rest of the dashboard
  } catch (err) {
    alert("Training Failed: " + (err.response?.data?.error || "Unknown Error"));
  } finally {
    setIsTraining(false);
  }
};

  useEffect(() => {
    if (token) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [token, fetchData]);

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>A-SOLARX</h1>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="input-group">
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {loginError && <div className="error-msg">{loginError}</div>}
            <button type="submit" className="login-btn">ACCESS DASHBOARD</button>
          </form>
        </div>
      </div>
    );
  }

  if (!systemData && !error) return <div className="loading-screen">Connecting to A-SolarX...</div>;

  return (
    <div className="dashboard-container">
      <header>
        <div className="header-left">
          <h1>A-SOLARX</h1>
          <div className="subtitle">Secure Energy Monitor (Local)</div>
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
              <span className="status-label">Power Mode</span>
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

            {/* --- UPDATED MODEL MANAGEMENT WITH ACCURACY DISPLAY --- */}
            <section className="training-card">
              <h3>⚙️ Model Management</h3>
              <p className="model-info">Active: {systemData.model_version}</p>
              
              <div className="accuracy-badge">
                Current Model Accuracy: <span>{modelAccuracy}</span>
              </div>

              <button 
                className={`train-btn ${isTraining ? 'loading' : ''}`} 
                onClick={handleTrainModel}
                disabled={isTraining}
              >
                {isTraining ? "RE-TRAINING MODEL..." : "🔄 TRAIN NEW MODEL"}
              </button>
            </section>
          </div>

          <div className="right-panel">
            <div className="metrics-grid">
              <MetricCard label="Solar Input" value={`${systemData?.metrics?.Solar_V?.toFixed(2) || '0.0'} V`} icon="☀️" />
              <MetricCard label="Battery" value={`${systemData?.metrics?.Battery_V?.toFixed(2) || '0.0'} V`} icon="⚡" />
              <MetricCard label="Humidity" value={`${systemData?.metrics?.Weather_Humidity || 0}%`} icon="💧" />
              <MetricCard label="Clouds" value={`${systemData?.metrics?.Weather_Clouds || 0}%`} icon="☁️" />
              <MetricCard label="Temp" value={`${systemData?.metrics?.Weather_Temp_C?.toFixed(1) || '0.0'}°C`} icon="🌡️" />
            </div>

            <div className="chart-container" style={{ height: "350px", background: "#1e293b", padding: "1rem", borderRadius: "1rem", border: "1px solid #334155" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                  <Legend verticalAlign="top" height={36} />
                  
                  <Line type="monotone" dataKey="Weather_Humidity" stroke="#3b82f6" name="Humidity (%)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="Solar_V" stroke="#eab308" name="Solar (V)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="Weather_Temp_C" stroke="#ef4444" name="Temp (°C)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="Weather_Clouds" stroke="#94a3b8" name="Clouds (%)" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="Battery_V" stroke="#10b981" name="Battery (V)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      <footer>System ID: ESP32_Proto_01 | Version: {systemData?.model_version || 'v1.0'}</footer>
    </div>
  );
}

const MetricCard = ({ label, value, icon }) => (
  <div className="metric-card">
    <div className="icon">{icon}</div>
    <div className="metric-info">
      <span className="metric-label">{label}</span>
      <span className="metric-val">{value}</span>
    </div>
  </div>
);

export default App;