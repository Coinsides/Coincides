import api from '@/services/api';

export interface ToolReceiptResource {
  kind?: string;
  id?: string;
  outcome?: string;
}

export type ToolReceiptStatus = 'proposed' | 'applied' | 'reverted' | 'dismissed';

export interface ToolReceiptQueueItem {
  id: string;
  tool: string;
  tier: string;
  resources: ToolReceiptResource[];
  intended_input_summary: string;
  created_at: string;
  status: ToolReceiptStatus;
  applied_at: string | null;
  reverted_at: string | null;
}

interface ToolReceiptListResponse {
  receipts: ToolReceiptQueueItem[];
}

export async function listToolReceipts(status: ToolReceiptStatus): Promise<ToolReceiptQueueItem[]> {
  const response = await api.get<ToolReceiptListResponse>('/tool-receipts', {
    params: { status },
  });
  return response.data.receipts;
}

export async function listProposedToolReceipts(): Promise<ToolReceiptQueueItem[]> {
  return listToolReceipts('proposed');
}

export async function applyToolReceipt(receiptId: string): Promise<void> {
  await api.post(`/tool-receipts/${encodeURIComponent(receiptId)}/apply`);
}

export async function dismissToolReceipt(receiptId: string): Promise<void> {
  await api.post(`/tool-receipts/${encodeURIComponent(receiptId)}/dismiss`);
}

export async function revertToolReceipt(receiptId: string): Promise<void> {
  await api.post(`/tool-receipts/${encodeURIComponent(receiptId)}/revert`);
}
