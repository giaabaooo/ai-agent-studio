export interface VoiceOptions {
  speakingRate?: number;
  pitch?: number;
  voiceName?: string;
}

export interface AudioSegmentResult {
  localPath: string;
  durationSec: number;
}

export interface VoiceProvider {
  generateSpeech(
    text: string,
    outputSubPath: string,
    options?: VoiceOptions
  ): Promise<AudioSegmentResult>;
}
