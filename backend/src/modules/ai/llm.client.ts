import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { extname } from 'path';

export interface LlmImage {
  path: string;
}

/**
 * Thin provider-agnostic LLM client used only inside the NestJS AI proxy.
 * Supports Anthropic Claude and OpenAI. API key never leaves the backend.
 * Every method returns `null` on any failure so callers can degrade
 * gracefully (mandatory constraint 5.1).
 */
@Injectable()
export class LlmClient {
  private logger = new Logger('LlmClient');

  /**
   * Providers: "anthropic" uses the Messages API; everything else
   * ("openai", "gemini", "groq", "openrouter") speaks the OpenAI-compatible
   * chat/completions protocol against a per-provider base URL, so free-tier
   * keys from Google AI Studio or Groq work out of the box.
   */
  private static OPENAI_COMPATIBLE: Record<string, { baseUrl: string; defaultModel: string }> = {
    openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
    gemini: {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      // "-latest" aliases track whichever model Google currently serves on
      // the free tier - pinned version numbers (2.0-flash, 1.5-flash, …)
      // regularly get deprecated or quota-zeroed for free-tier keys.
      defaultModel: 'gemini-flash-lite-latest',
    },
    groq: {
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    },
    openrouter: {
      baseUrl: 'https://openrouter.ai/api/v1',
      defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    },
  };

  get enabled() {
    const provider = process.env.AI_PROVIDER;
    return (
      !!process.env.AI_API_KEY &&
      (provider === 'anthropic' || provider in LlmClient.OPENAI_COMPATIBLE)
    );
  }

 private debug() {
  console.log("================================");
  console.log("AI Provider:", process.env.AI_PROVIDER);
  console.log("AI Model:", process.env.AI_MODEL);
  console.log("AI Enabled:", this.enabled);
  console.log("================================");
}
  /**
   * Send a prompt (optionally with an image) and get raw text back.
   * `system` sets behaviour; `user` carries the task + context.
   */
  async complete(system: string, user: string, image?: LlmImage): Promise<string | null> {
      this.debug();
    if (!this.enabled) return null;    try {
      const provider = process.env.AI_PROVIDER;
      return provider === 'anthropic'
        ? await this.anthropic(system, user, image)
        : await this.openai(system, user, image);
    } catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  this.logger.warn(`LLM call failed, falling back: ${message}`);
  return null;
}
  }

  /** Convenience: complete() then parse the first JSON object in the reply. */
  async completeJson<T>(system: string, user: string, image?: LlmImage): Promise<T | null> {
    const text = await this.complete(system, user, image);
    if (!text) return null;
    try {
      const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      return match ? (JSON.parse(match[0]) as T) : null;
    } catch {
      this.logger.warn('LLM returned non-JSON output, falling back');
      return null;
    }
  }

  private imageToBase64(image: LlmImage) {
    const media = { '.png': 'image/png', '.webp': 'image/webp' }[extname(image.path).toLowerCase()] ?? 'image/jpeg';
    return { data: readFileSync(image.path).toString('base64'), media };
  }

  private async anthropic(system: string, user: string, image?: LlmImage) {
    const content: unknown[] = [];
    if (image) {
      const { data, media } = this.imageToBase64(image);
      content.push({ type: 'image', source: { type: 'base64', media_type: media, data } });
    }
    content.push({ type: 'text', text: user });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.AI_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-sonnet-5',
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const json = await res.json();
    return json.content?.[0]?.text ?? null;
  }

  private async openai(system: string, user: string, image?: LlmImage) {
    const preset =
      LlmClient.OPENAI_COMPATIBLE[process.env.AI_PROVIDER] ??
      LlmClient.OPENAI_COMPATIBLE.openai;
    const baseUrl = (process.env.AI_BASE_URL || preset.baseUrl).replace(/\/$/, '');

    const content: unknown[] = [{ type: 'text', text: user }];
    if (image) {
      const { data, media } = this.imageToBase64(image);
      content.push({ type: 'image_url', image_url: { url: `data:${media};base64,${data}` } });
    }
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || preset.defaultModel,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`${process.env.AI_PROVIDER} ${res.status}`);
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;
  }
}
