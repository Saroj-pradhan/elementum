export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ id: `${rank}-${suit}`, rank, suit })))
}

export function shuffle(cards, random = Math.random) {
  const result = [...cards]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function dealRound(deck) {
  const shuffled = shuffle(deck)
  const tableCards = shuffled.slice(0, 4)
  const hands = [[], [], [], []]
  let cursor = 4
  for (let batch = 0; batch < 3; batch += 1) {
    for (let player = 0; player < 4; player += 1) {
      hands[player].push(...shuffled.slice(cursor, cursor + 4))
      cursor += 4
    }
  }
  return { tableCards, hands }
}
