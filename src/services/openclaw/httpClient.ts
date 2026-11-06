export class OpenClawHttpClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl = 'http://127.0.0.1:18789', authToken = '') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.authToken = authToken;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  public async getModels(signal?: AbortSignal): Promise<{ models: string[]; raw?: any }> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal,
      });

      if (!res.ok) {
        throw new Error(`GET /v1/models returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const models = Array.isArray(data?.data) ? data.data.map((m: any) => m.id || m.name) : [];
      return { models, raw: data };
    } catch (err: any) {
      return { models: [], raw: { error: err.message } };
    }
  }

  public async invokeTool(toolName: string, args: Record<string, unknown> = {}, signal?: AbortSignal): Promise<any> {
    const res = await fetch(`${this.baseUrl}/tools/invoke`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        tool: toolName,
        args,
      }),
      signal,
    });

    if (res.status === 405) {
      throw new Error(`HTTP 405: /tools/invoke is not enabled by HTTP in openclaw.json. Please use WebSocket tools.invoke.`);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Tool invocation failed (HTTP ${res.status}): ${errText}`);
    }

    return await res.json();
  }
}

