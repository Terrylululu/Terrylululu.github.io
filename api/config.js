const defaultModel =
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
  process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ||
  process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ||
  'mimo-v2.5-pro';

export default function handler(_request, response) {
  response.status(200).json({
    model: defaultModel,
    baseUrlConfigured: Boolean(process.env.ANTHROPIC_BASE_URL),
    tokenConfigured: Boolean(process.env.ANTHROPIC_AUTH_TOKEN)
  });
}
