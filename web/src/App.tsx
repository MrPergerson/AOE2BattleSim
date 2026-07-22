import { useState } from "react";
import { CombatSim } from "./components/CombatSim";
import { ApproachSim } from "./components/ApproachSim";
import { TechTree } from "./components/TechTree";
import "./App.css";

type Tab = "combat" | "tech-tree" | "approach";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("combat");

  return (
    <div className="app">
      <h1>AOE2 Battle Sim</h1>
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
        <button
          type="button"
          className={activeTab === "approach" ? "active" : ""}
          onClick={() => setActiveTab("approach")}
        >
          Approach Sim
        </button>
      </div>
      {activeTab === "combat" ? (
        <CombatSim />
      ) : activeTab === "tech-tree" ? (
        <TechTree />
      ) : (
        <ApproachSim />
      )}
    </div>
  );
}

export default App;
