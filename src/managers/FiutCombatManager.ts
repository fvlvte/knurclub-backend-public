import { FiutPlayer } from "../types/FiutPlayer";
import { FiutItemTypes } from "../types/FiutItemTypes";

export class FiutCombatManager {
  private static _instance: FiutCombatManager;

  public static getInstance() {
    if (!FiutCombatManager._instance) {
      this._instance = FiutCombatManager._instance = new FiutCombatManager();
    }
    return this._instance;
  }

  private calculateBattlePower(player: FiutPlayer): number {
    let bp = 0;

    const factorMultipiler = Math.random() > 0.5 ? 1 : -1;

    const fiutRandomFactor = 0.05 * Math.random();

    bp = Math.round(
      player.rozmiarFiut +
        player.rozmiarFiut * fiutRandomFactor * factorMultipiler,
    );

    if (
      player.equippedItemExpiresAt &&
      player.equippedItemExpiresAt > Date.now()
    ) {
      switch (player.equippedItem) {
        case FiutItemTypes.IGLA: {
          bp *= 1.2;
          break;
        }
        case FiutItemTypes.PIERSCIEN: {
          bp += 10;
          break;
        }
      }
    }

    return bp;
  }

  private calculateDefensePower(player: FiutPlayer) {
    let dp = 0;

    const factorMultipiler = Math.random() > 0.5 ? 1 : -1;

    const fiutRandomFactor = 0.05 * Math.random();

    dp = Math.round(
      player.rozmiarFiut +
        player.rozmiarFiut * fiutRandomFactor * factorMultipiler,
    );

    if (
      player.equippedItemExpiresAt &&
      player.equippedItemExpiresAt > Date.now()
    ) {
      switch (player.equippedItem) {
        case FiutItemTypes.KONDOM: {
          dp *= 1.2;
          break;
        }
        case FiutItemTypes.PAS_CNOTY: {
          dp += 10;
          break;
        }
      }
    }

    return dp;
  }

  public handleBattle(attacker: FiutPlayer, victim: FiutPlayer) {
    const attackerBP = this.calculateBattlePower(attacker);
    const victimDP = this.calculateDefensePower(victim);

    const totalPower = attackerBP + victimDP;

    let attackerWinChance = attackerBP / totalPower;

    if (
      attacker.equippedItemExpiresAt &&
      attacker.equippedItem &&
      attacker.equippedItem === FiutItemTypes.KOLCZYK
    ) {
      attackerWinChance += 0.05;
    }

    if (
      victim.equippedItemExpiresAt &&
      victim.equippedItem &&
      victim.equippedItem === FiutItemTypes.KOLCZYK
    ) {
      attackerWinChance -= 0.05;
    }

    /*if (attackerWinChance > 0.69) {
      throw new Error(
        "stary znajdź se godnego przeciwnika bo masz za dużego bydlaka a nie malucha stary",
      );
    }*/

    return {
      winner: Math.random() <= attackerWinChance ? attacker : victim,
      bp: attackerBP,
      dp: victimDP,
    };
  }
}
