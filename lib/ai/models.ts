export const AI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'openai' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
] as const;

export const DEFAULT_MODEL = AI_MODELS[0].id;
export const DAILY_REQUEST_LIMIT = 50;

export function isAllowedModel(model: string) {
  return AI_MODELS.some((item) => item.id === model);
}
