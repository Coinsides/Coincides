import api from '@/services/api';

export interface ToolReceiptResource {
  kind?: string;
  id?: string;
  outcome?: string;
}

export interface ToolReceiptQueueItem {
  id: string;
  tool: string;
  tier: string;
  resources: ToolReceiptResource[];
  intended_input_summary: string;
  created_at: string;
}

interface ToolReceiptListResponse {
  receipts: ToolReceiptQueueItem[];
}

export async function listProposedToolReceipts(): Promise<ToolReceiptQueueItem[]> {
  const response = await api.get<ToolReceiptListResponse>('/tool-receipts', {
    params: { status: 'proposed' },
  });
  return response.data.receipts;
}

export async function applyToolReceipt(receiptId: string): Promise<void> {
  await api.post(`/tool-receipts/${encodeURIComponent(receiptId)}/apply`);
}

export async function dismissToolReceipt(receiptId: string): Promise<void> {
  await api.post(`/tool-receipts/${encodeURIComponent(receiptId)}/dismiss`);
}
