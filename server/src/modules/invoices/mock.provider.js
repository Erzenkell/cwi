import { EInvoiceProvider } from './einvoice-provider.interface.js';

export class MockEInvoiceProvider extends EInvoiceProvider {
  async sendInvoice(invoice) {
    return {
      success: true,
      provider: 'mock',
      external_id: `MOCK-${invoice.id}-${Date.now()}`,
      status: 'submitted',
      response_payload: {
        accepted: true,
        routed: true,
        message: 'Invoice submitted to mock platform',
      },
    };
  }

  async getStatus(externalId) {
    return {
      external_id: externalId,
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    };
  }

  async cancelInvoice(externalId) {
    return {
      external_id: externalId,
      status: 'cancelled',
    };
  }
}