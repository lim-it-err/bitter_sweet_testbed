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
      if (rng() < 0.3) {
        const circle = adjacent[Math.floor(rng() * adjacent.length)];
        game.policeAction(patrol.id, 'arrest', circle);
      } else {
        game.policeAction(patrol.id, 'search');
      }
      if (game.phase === 'gameOver') return;
    }
    game.endPoliceTurn();
  },
};
