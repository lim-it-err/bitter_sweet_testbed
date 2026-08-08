export const randomPolice = {
  key: 'random',
  name: 'Random',

  takeTurn(game, rng) {
    for (const patrol of game.patrols) {
      const reachable = [...game.patrolReachable(patrol)];
      if (reachable.length > 0) {
        const target = reachable[Math.floor(rng() * reachable.length)];
        game.movePatrol(patrol.id, target);
      }

      const adjacent = game.patrolAdjacentCircles(patrol);
      if (adjacent.length === 0) {
        patrol.acted = true;
        continue;
      }
      const circle = adjacent[Math.floor(rng() * adjacent.length)];
      const kind = rng() < 0.3 ? 'arrest' : 'search';
      game.policeAction(patrol.id, kind, circle);
      if (game.phase === 'gameOver') return;
    }
    game.endPoliceTurn();
  },
};
