import { Howl } from 'howler'

/**
 * Electric / current SFX scaffold.
 * Drop real assets under /public/audio and wire triggers from gesture events later.
 */
export class ElectricAudio {
  private ready = false
  private spark: Howl | null = null

  async init(): Promise<void> {
    // Assets are optional during scaffold; Howl will no-op if file missing until added.
    this.spark = new Howl({
      src: ['/audio/electric-spark.mp3'],
      volume: 0.4,
      preload: false,
    })
    this.ready = true
  }

  playSpark(): void {
    if (!this.ready || !this.spark) return
    this.spark.play()
  }
}

export const electricAudio = new ElectricAudio()
