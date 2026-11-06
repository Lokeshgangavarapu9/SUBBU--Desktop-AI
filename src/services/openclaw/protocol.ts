import { OpenClawReqFrame, OpenClawResFrame, OpenClawEventFrame, OpenClawFrame } from '../../types/openclaw';

let idCounter = 0;

export function generateRequestId(prefix = 'subbu'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function createRequestFrame<T>(method: string, params?: T): OpenClawReqFrame<T> {
  return {
    type: 'req',
    id: generateRequestId(),
    method,
    params,
  };
}

export function parseIncomingFrame(data: string): OpenClawFrame | null {
  try {
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object' || !parsed.type) {
      return null;
    }
    return parsed as OpenClawFrame;
  } catch (err) {
    console.error('[OpenClawProtocol] Failed to parse frame:', err);
    return null;
  }
}

