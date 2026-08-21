import { suitSymbol } from '../game/cardUtils'

export default function Card({ card, selected, onClick, small = false }) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds'
  return <button type="button" onClick={onClick} className={`relative flex ${small ? 'h-16 w-11' : 'h-24 w-16 sm:h-28 sm:w-20'} flex-col rounded-lg border-2 bg-[#fffdf5] p-1.5 text-left shadow-md transition ${selected ? 'scale-105 border-amber-400 -translate-y-2' : 'border-stone-200 hover:-translate-y-1'} ${red ? 'text-red-600' : 'text-stone-900'}`}>
    <span className="text-sm font-black leading-none">{card.rank}</span><span className="text-lg leading-none">{suitSymbol[card.suit]}</span><span className="absolute bottom-1 right-1 text-2xl">{suitSymbol[card.suit]}</span>
  </button>
}
