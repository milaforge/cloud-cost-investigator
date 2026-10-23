// Compatibility entry point; the shared transport accepts any configured model.
import { DEFAULT_NVIDIA_MODEL, nvidiaConfig } from '../config.ts';
import { OpenAICompatiblePlanner } from './model.ts';
export { DEFAULT_NVIDIA_MODEL } from '../config.ts';

export class NvidiaPlanner extends OpenAICompatiblePlanner {
  constructor(model = process.env.NVIDIA_MODEL ?? DEFAULT_NVIDIA_MODEL) {
    super(nvidiaConfig(model, process.env.NVIDIA_API_KEY));
  }
}
