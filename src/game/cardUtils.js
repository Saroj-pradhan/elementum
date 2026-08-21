export const cardValue = (card) => {
  if (card.rank === 'A') return 1
  if (['J', 'Q', 'K'].includes(card.rank)) return null
  return Number(card.rank)
}
export const isNumericCard = (card) => cardValue(card) !== null
export const teamForSeat = (seat) => (seat === 0 || seat === 2 ? 1 : 2)
export const suitSymbol = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }
