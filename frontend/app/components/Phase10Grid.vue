<template>
  <div class="t-surface border t-border rounded-xl overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b t-border">
            <th class="px-3 py-2.5 text-left font-medium t-text-muted whitespace-nowrap">Spieler</th>
            <th
              v-for="n in 10"
              :key="n"
              class="px-2 py-2.5 text-center font-medium t-text-muted whitespace-nowrap w-8"
            >
              {{ n }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in players" :key="player.id" class="border-b t-border last:border-b-0">
            <td class="px-3 py-2 font-medium t-text whitespace-nowrap text-xs">
              <div class="flex items-center gap-1.5">
                <img
                  v-if="player.avatarPath"
                  :src="player.avatarPath"
                  :alt="player.displayName"
                  class="w-5 h-5 rounded-full object-cover shrink-0"
                >
                <div v-else class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold t-text shrink-0">
                  {{ player.displayName.charAt(0).toUpperCase() }}
                </div>
                <span :class="{ 'opacity-50': !player.joined }">{{ player.displayName }}</span>
              </div>
            </td>
            <td v-for="n in 10" :key="n" class="px-1 py-1 text-center">
              <button
                class="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                :class="isPhaseCompleted(player.id, n)
                  ? 'bg-green-500/20 text-green-400'
                  : 'hover:bg-white/5 t-text-muted'"
                :disabled="!canEdit(player.id)"
                @click="togglePhase(player.id, n)"
              >
                <svg v-if="isPhaseCompleted(player.id, n)" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                </svg>
                <span v-else class="text-[10px]">·</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GamePlayer, Phase10Phase } from '@shared/types/game'

const props = defineProps<{
  players: GamePlayer[]
  phases: Phase10Phase[]
  isCreator: boolean
  currentPlayerId: string | null
}>()

const emit = defineEmits<{
  phaseToggle: [playerId: string, phaseNumber: number, completed: boolean]
}>()

function isPhaseCompleted(playerId: string, phaseNumber: number): boolean {
  return props.phases.some(p => p.playerId === playerId && p.phaseNumber === phaseNumber && p.completed)
}

function canEdit(playerId: string): boolean {
  return props.isCreator || playerId === props.currentPlayerId
}

function togglePhase(playerId: string, phaseNumber: number) {
  const current = isPhaseCompleted(playerId, phaseNumber)
  emit('phaseToggle', playerId, phaseNumber, !current)
}
</script>
