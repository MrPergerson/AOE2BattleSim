import type { Civ, TechTree, Unit, Upgrade } from "../types";

const dataUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`;

let civsPromise: Promise<Civ[]> | null = null;
const unitsByCiv = new Map<number, Promise<Unit[]>>();
const techTreeByCiv = new Map<number, Promise<TechTree>>();
const upgradesByCiv = new Map<number, Promise<Upgrade[]>>();

export function getCivs(): Promise<Civ[]> {
  if (!civsPromise) {
    civsPromise = fetch(dataUrl("civs.json")).then((res) => res.json());
  }
  return civsPromise;
}

export function getUnits(civId: number): Promise<Unit[]> {
  let promise = unitsByCiv.get(civId);
  if (!promise) {
    promise = fetch(dataUrl(`units/${civId}.json`)).then((res) => res.json());
    unitsByCiv.set(civId, promise);
  }
  return promise;
}

export function getTechTree(civId: number): Promise<TechTree> {
  let promise = techTreeByCiv.get(civId);
  if (!promise) {
    promise = fetch(dataUrl(`tech_tree/${civId}.json`)).then((res) => res.json());
    techTreeByCiv.set(civId, promise);
  }
  return promise;
}

export function getUpgrades(civId: number): Promise<Upgrade[]> {
  let promise = upgradesByCiv.get(civId);
  if (!promise) {
    promise = fetch(dataUrl(`upgrades/${civId}.json`)).then((res) => res.json());
    upgradesByCiv.set(civId, promise);
  }
  return promise;
}
