import type { z } from 'zod';
import type { LaunchSchema } from '../schemas/launch.schema';

export type LaunchOptions = z.infer<typeof LaunchSchema.options>;
export type LaunchProgress = z.infer<typeof LaunchSchema.progress>;
export type LaunchResult = z.infer<typeof LaunchSchema.result>;
export type LaunchWarning = z.infer<typeof LaunchSchema.warning>;
export type WindowSize = { width: number; height: number };
