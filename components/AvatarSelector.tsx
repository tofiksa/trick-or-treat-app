'use client';

import { useState } from 'react';

interface AvatarSelectorProps {
  selectedAvatar: string;
  onAvatarSelect: (avatar: string) => void;
}

// Halloween-themed avatars
const AVATARS = [
  '🎃', // Jack-o'-lantern
  '👻', // Ghost
  '🧙', // Witch
  '🧛', // Vampire
  '🦇', // Bat
  '🕷️', // Spider
  '🕸️', // Spider web
  '💀', // Skull
  '☠️', // Skull and crossbones
  '🧟', // Zombie
  '🌙', // Moon
  '⭐', // Star
  '🔥', // Fire
  '⚰️', // Coffin
  '🎭', // Theater masks
  '🍬', // Candy
  '🍭', // Lollipop
  '🍫', // Chocolate bar
  '🎨', // Artist palette
  '🎪', // Circus tent
];

export default function AvatarSelector({ selectedAvatar, onAvatarSelect }: AvatarSelectorProps) {
  return (
    <div>
      <label className="block text-lg font-semibold text-purple-light mb-3">
        Velg ditt avatar
      </label>
      <div className="grid grid-cols-5 gap-3">
        {AVATARS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => onAvatarSelect(avatar)}
            className={`text-3xl p-3 rounded-xl border-2 transition-all hover:scale-110 active:scale-95 ${
              selectedAvatar === avatar
                ? 'border-orange-primary bg-orange-primary/20 scale-110'
                : 'border-purple-primary bg-black-secondary hover:bg-purple-primary/10'
            }`}
            aria-label={`Select ${avatar} avatar`}
          >
            {avatar}
          </button>
        ))}
      </div>
      {selectedAvatar && (
        <div className="mt-3 text-center text-purple-secondary text-sm">
          Valgt: <span className="text-2xl">{selectedAvatar}</span>
        </div>
      )}
    </div>
  );
}

