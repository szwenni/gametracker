<template>
  <div class="t-surface border t-border rounded-xl overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b t-border">
            <th class="px-3 py-2.5 text-left font-medium t-text-muted whitespace-nowrap">#</th>
            <th
              v-for="player in players"
              :key="player.id"
              class="px-3 py-2.5 text-center font-medium t-text-muted whitespace-nowrap min-w-[70px]"
            >
              <div class="flex flex-col items-center gap-1">
                <img
                  v-if="player.avatarPath"
                  :src="player.avatarPath"
                  :alt="player.displayName"
                  class="w-6 h-6 rounded-full object-cover"
                >
                <div v-else class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold t-text">
                  {{ player.displayName.charAt(0).toUpperCase() }}
                </div>
                <span :class="{ 'opacity-50': !player.joined }">{{ player.displayName }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="round in rounds" :key="round.id" class="border-b t-border">
            <td class="px-3 py-2 font-medium t-text-muted">{{ round.roundNumber }}</td>
            <td
              v-for="player in players"
              :key="player.id"
              class="px-1 py-1 text-center"
            >
              <input
                v-if="canEdit(player.id)"
                type="number"
                :value="getScore(round.id, player.id)"
                class="w-full text-center text-xs py-1.5 px-1 rounded-md t-text focus:outline-none focus:ring-1"
                style="background-color: var(--theme-surface-alt); --tw-ring-color: var(--theme-primary)"
                @change="(e) => handleScoreChange(round.id, player.id, e)"
              >
              <span v-else class="text-sm t-text tabular-nums">
                {{ getScore(round.id, player.id) ?? '-' }}
              </span>
            </td>
          </tr>

          <!-- Totals row -->
          <tr v-if="rounds.length > 0" class="font-bold">
            <td class="px-3 py-2.5 t-text-muted">Σ</td>
            <td v-for="player in players" :key="player.id" class="px-3 py-2.5 text-center t-text tabular-nums">
              {{ getTotal(player.id) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GamePlayer, GameRound, GameScore } from '@shared/types/game'

const props = defineProps<{
  players: GamePlayer[]
  rounds: GameRound[]
  scores: GameScore[]
  isCreator: boolean
  currentPlayerId: string | null
}>()

const emit = defineEmits<{
  scoreChange: [roundId: string, playerId: string, score: number]
}>()

function canEdit(playerId: string): boolean {
  return props.isCreator || playerId === props.currentPlayerId
}

function getScore(roundId: string, playerId: string): number | null {
  const score = props.scores.find(s => s.roundId === roundId && s.playerId === playerId)
  return score?.score ?? null
}

function getTotal(playerId: string): number {
  return props.scores
    .filter(s => s.playerId === playerId)
    .reduce((sum, s) => sum + s.score, 0)
}

function handleScoreChange(roundId: string, playerId: string, e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value)
  if (!isNaN(value)) {
    emit('scoreChange', roundId, playerId, value)
  }
}
</script>
