function resolveTurn({ battle, run, card, now = new Date() }) {
  let { playerCurrentHp, playerBlock, enemyCurrentHp } = battle;
  const log = [...(battle.log || [])];

  if (card.type === 'attack') {
      const rawDamage = card.value;
      const blockedByEnemy = Math.min(rawDamage, battle.enemyDefense);
      const actualDamage = rawDamage - blockedByEnemy;
      enemyCurrentHp = Math.max(0, enemyCurrentHp - actualDamage);
      log.push(`Jogador usou ${card.name} e causou ${actualDamage} de dano.`);
  } else if (card.type === 'block') {
      playerBlock += card.value;
      log.push(`Jogador usou ${card.name} e ganhou ${card.value} de bloqueio.`);
  } else if (card.type === 'heal') {
      const hpBeforeHeal = playerCurrentHp;
      playerCurrentHp = Math.min(run.playerMaxHp, playerCurrentHp + card.value);
      const healed = playerCurrentHp - hpBeforeHeal;
      log.push(`Jogador usou ${card.name} e recuperou ${healed} de HP.`);
  }

  if (enemyCurrentHp > 0) {
    let enemyDamage = battle.enemyAttack;
    const usedSpecial = battle.type === 'boss' && battle.turn % 3 === 0;

    if (usedSpecial) {
      enemyDamage = battle.enemySpecialAttack || battle.enemyAttack * 2;
    }

    const damageAfterBlock = Math.max(0, enemyDamage - playerBlock);
    playerCurrentHp = Math.max(0, playerCurrentHp - damageAfterBlock);
    playerBlock = Math.max(0, playerBlock - enemyDamage);

    if (usedSpecial) {
      log.push(`Boss usou ataque especial causando ${damageAfterBlock} de dano.`);
    } else if (damageAfterBlock > 0) {
      log.push(`Inimigo atacou causando ${damageAfterBlock} de dano.`);
    } else {
      log.push('Inimigo atacou, mas o bloqueio absorveu todo o dano.');
    }
  }

  let outcome = 'active';
  let finishedAt = null;

  if (enemyCurrentHp <= 0) {
    outcome = 'victory';
    finishedAt = now;
    log.push('Inimigo derrotado.');
  } else if (playerCurrentHp <= 0) {
    outcome = 'defeat';
    finishedAt = now;
    log.push('Jogador derrotado.');
  }

  return {
    outcome,
    playerCurrentHp,
    battlePatch: {
      playerCurrentHp,
      playerBlock: Math.max(0, playerBlock),
      enemyCurrentHp,
      turn: battle.turn + 1,
      status: outcome,
      log,
      finishedAt
    }
  };
}

module.exports = { resolveTurn };
