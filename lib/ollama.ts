export interface OllamaOptions {
  baseUrl: string;
  model: string;
}

export class Ollama {
  private baseUrl: string;
  private model: string;

  constructor(options: OllamaOptions) {
    this.baseUrl = options.baseUrl;
    this.model = options.model;
  }

  private getApiUrl(endpoint: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}/${endpoint}`;
  }

  async call(prompt: string, temperature = 0.2): Promise<string> {
    const response = await fetch(this.getApiUrl("api/generate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.response;
  }

  async stream(
    prompt: string,
    temperature = 0.7
  ): Promise<ReadableStream<string>> {
    const response = await fetch(this.getApiUrl("api/chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        options: {
          temperature: temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API stream error: ${response.status} ${errorText}`
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.trim()) {
              try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                  controller.enqueue(json.message.content);
                }
              } catch (e) {
                // Ignore parse errors on incomplete JSON
              }
            }
          }
        }
        controller.close();
      },
    });

    return stream;
  }
}
