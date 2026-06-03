export class EInvoiceProvider {
  async sendInvoice(_invoice) {
    throw new Error('sendInvoice not implemented');
  }

  async getStatus(_externalId) {
    throw new Error('getStatus not implemented');
  }

  async cancelInvoice(_externalId) {
    throw new Error('cancelInvoice not implemented');
  }
}