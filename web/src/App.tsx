import { useState } from "react";
import { CombatSim } from "./components/CombatSim";
import { TechTree } from "./components/TechTree";
import type { SimMode } from "./types";
import "./App.css";

type Tab = "combat" | "tech-tree";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("combat");
  const [mode, setMode] = useState<SimMode>("simple");

  return (
    <div className="app">
      <div className="app-header">
        <h1>AOE2 Battle Sim</h1>
        <div className="app-header-right">
          <div className="tabs">
            <button
              type="button"
              className={activeTab === "combat" ? "active" : ""}
              onClick={() => setActiveTab("combat")}
            >
              Combat Sim
            </button>
            <button
              type="button"
              className={activeTab === "tech-tree" ? "active" : ""}
              onClick={() => setActiveTab("tech-tree")}
            >
              Tech Tree
            </button>
          </div>
          {activeTab === "combat" && (
            <div className="mode-toggle">
              <button
                type="button"
                className={mode === "simple" ? "btn btn-primary" : "btn btn-ghost"}
                onClick={() => setMode("simple")}
              >
                Simple
              </button>
              <button
                type="button"
                className={mode === "advanced" ? "btn btn-primary" : "btn btn-ghost"}
                onClick={() => setMode("advanced")}
              >
                Advanced
              </button>
            </div>
          )}
        </div>
      </div>
      {activeTab === "combat" ? <CombatSim mode={mode} /> : <TechTree />}
    </div>
  );
}

export default App;
