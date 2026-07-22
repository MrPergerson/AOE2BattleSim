export interface Civ {
  id: number;
  name: string;
}

export interface ClassAmount {
  class_: number;
  class_name: string;
  amount: number;
}

export interface ResourceCost {
  type: number;
  amount: number;
}

export interface Unit {
  id: number;
  name: string;
  internal_name: string;
  hit_points: number;
  line_of_sight: number;
  speed: number | null;
  class_: number;
  class_name: string;
  base_armor: number;
  attacks: ClassAmount[];
  armours: ClassAmount[];
  max_range: number;
  min_range: number;
  blast_damage: number;
  reload_time: number;
  displayed_attack: number;
  displayed_range: number;
  displayed_reload_time: number;
  displayed_melee_armour: number;
  displayed_pierce_armour: number;
  accuracy_percent: number;
  frame_delay: number;
  resource_costs: ResourceCost[];
  train_time: number | null;
}

export type TechTreeNodeStatus = "ResearchedCompleted" | "ResearchRequired" | "NotAvailable";

export interface TechTreeNode {
  id: number;
  name: string;
  node_type: string | null;
  status: TechTreeNodeStatus;
  age: number;
  building_id: number | null;
  link_id: number | null;
}

export interface TechTree {
  buildings: TechTreeNode[];
  units: TechTreeNode[];
}

export type UpgradeLine =
  | "melee_attack"
  | "ranged_attack"
  | "infantry_armor"
  | "cavalry_armor"
  | "ranged_armor"
  | "siege_range"
  | "siege_weapon"
  | "ship_pierce_armor"
  | "unclassified";

export type UpgradeSource = "Blacksmith" | "University" | "Unique";

export interface Upgrade {
  id: number;
  name: string;
  line: UpgradeLine;
  source: UpgradeSource;
  age: number;
  status: TechTreeNodeStatus;
  attack_bonus: number;
  range_bonus: number;
  melee_armor_bonus: number;
  pierce_armor_bonus: number;
}
