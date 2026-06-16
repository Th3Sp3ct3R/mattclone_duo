function inferPlatform(productName = '') {
  const name = String(productName).toLowerCase();
  if (name.includes('instagram') || name.includes('инст')) return 'instagram';
  if (name.includes('tiktok') || name.includes('тик')) return 'tiktok';
  return 'tiktok';
}

function parseCredentialLine(line = '') {
  const normalized = String(line).trim();
  if (!normalized || normalized.startsWith('#')) return null;
  const delimiter = ['|', ':', ';'].find((candidate) => normalized.includes(candidate));
  if (!delimiter) return null;
  const [username, password, email, emailPassword] = normalized.split(delimiter).map((part) => part.trim());
  if (!username || !password) return null;
  return { username, password, email: email || '', emailPassword: emailPassword || '' };
}

export function parseCredentialFile(text = '') {
  return String(text)
    .split(/\r?\n/)
    .map(parseCredentialLine)
    .filter(Boolean);
}

function normalizeOrdersResponse(response) {
  if (Array.isArray(response)) return { orders: response, hasNext: false };
  const orders = response.data || response.items || response.orders || [];
  const hasNext = Boolean(response.links?.next || response.next_page_url || response.meta?.current_page < response.meta?.last_page);
  return { orders, hasNext };
}

export class DjekxaImporter {
  constructor({ client, fxRubPerUsd = 90 } = {}) {
    if (!client) throw new Error('Djekxa client is required');
    this.client = client;
    this.fxRubPerUsd = Number(fxRubPerUsd || 90);
  }

  async syncRecent({ maxPages = 5, perPage = 20, existingOrderIds = new Set() } = {}) {
    const imports = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const response = await this.client.listOrders({ page, per_page: perPage });
      const { orders, hasNext } = normalizeOrdersResponse(response);
      if (!orders.length) break;
      for (const order of orders) {
        if (existingOrderIds.has(String(order.uuid || order.id))) {
          imports.push({ externalOrderId: String(order.uuid || order.id), skipped: true, reason: 'duplicate' });
          continue;
        }
        imports.push(await this.importOrder(order));
      }
      if (!hasNext) break;
    }
    return imports;
  }

  async importOrder(order) {
    const externalOrderId = String(order.uuid || order.id || '');
    if (!externalOrderId) throw new Error('Djekxa order has no id');
    if (['pending', 'in-progress'].includes(String(order.status || '').toLowerCase())) {
      return { externalOrderId, skipped: true, reason: 'pending', rawOrder: order };
    }

    const items = order.items || order.order_items || [];
    const totalRub = Number(order.total_sum || order.totalRub || order.total || 0);
    const totalUsdCents = Math.round((totalRub / this.fxRubPerUsd) * 100);
    const accountCount = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0) || 1;
    const priceUsdCents = Math.round(totalUsdCents / accountCount);
    const importedAccounts = [];

    for (const item of items) {
      const productName = item.product_name || item.name || order.product_name || '';
      const platform = inferPlatform(productName);
      const fileUrl = item.link_to_file || item.file_url || item.download_url;
      if (!fileUrl || String(item.status || order.status).toLowerCase() !== 'completed') continue;
      const file = await this.client.fetchCredentialFile(fileUrl);
      for (const credentials of parseCredentialFile(file)) {
        importedAccounts.push({
          platform,
          credentials,
          priceUsdCents,
          priceRub: totalRub / accountCount,
          productName
        });
      }
    }

    return {
      externalOrderId,
      status: String(order.status || 'completed'),
      totalRub,
      totalUsdCents,
      fxRubPerUsd: this.fxRubPerUsd,
      importedAccounts,
      rawOrder: order
    };
  }
}
