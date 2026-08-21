const hasCard = (cards, rank, suit) => cards.some((card) => card.rank === rank && card.suit === suit)
export function calculateRoundScore(capturedCards, sweeps = 0) {
  const result = { bigCasino: hasCard(capturedCards, '10', 'diamonds') ? 2 : 0, littleCasino: hasCard(capturedCards, '2', 'spades') ? 2 : 0, aces: capturedCards.filter((card) => card.rank === 'A').length, mostCards: capturedCards.length > 26 ? 1 : 0, mostSpades: capturedCards.filter((card) => card.suit === 'spades').length >= 7 ? 1 : 0, sweeps }
  return { ...result, total: Object.values(result).reduce((sum, value) => sum + value, 0) }
}
