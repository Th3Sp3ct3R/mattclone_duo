// createDarkShoppingProcurementAdapter — implements the domain ProcurementPort
// over an injected dark.shopping `client` and an injected delivery `importer`.
//
// The purchase() guard sequence mirrors the engine precedent (createLiveOrder):
//   (1) live-price drift vs expected > tolerance  -> throw
//   (2) live total > maxTotal                      -> throw
//   (3) balance < live total                       -> throw
// client.purchase() runs only after all three guards pass. Each guard throws
// its own distinct coded DomainError so callers can branch on the reason.
import { domainError } from '@julio/whatsapp';

// PROVISIONAL external-shape seam — VERIFY against a real dark.shopping balance
// response at go-live. Defaults to 0 when the shape is unrecognized so the
// balance guard fails safe (0 < any positive total => insufficient balance).
function readBalanceUsdCents(b) {
  return b?.balanceUsdCents ?? b?.balance_usd_cents ?? 0;
}

// PROVISIONAL external-shape seam — VERIFY against a real dark.shopping offers
// response at go-live. Defaults to 0 when the shape is unrecognized so the
// price-drift guard fails safe (unit 0 => 100% drift => throw).
function pickUnitPriceUsdCents(offers) {
  return Array.isArray(offers) && offers[0]
    ? (offers[0].unitPriceUsdCents ?? offers[0].price_usd_cents ?? 0)
    : 0;
}

export function createDarkShoppingProcurementAdapter({ client, importer, config }) {
  return {
    async getBalance() {
      const b = await client.getBalance();
      return { balanceUsdCents: readBalanceUsdCents(b) };
    },

    async listOffers() {
      return client.listOffers();
    },

    async purchase(quantity) {
      const offers = await client.listOffers();
      const liveUnit = pickUnitPriceUsdCents(offers);

      // (1) price drift
      const drift = Math.abs(liveUnit - config.expectedUnitUsdCents) / config.expectedUnitUsdCents;
      if (drift > (config.priceDriftTolerance ?? 0.1)) {
        throw domainError('PROCUREMENT_PRICE_DRIFT', `unit price drift ${(drift * 100).toFixed(1)}%`);
      }

      // (2) max total
      const liveTotal = liveUnit * quantity;
      if (config.maxTotalUsdCents && liveTotal > config.maxTotalUsdCents) {
        throw domainError(
          'PROCUREMENT_MAX_TOTAL_EXCEEDED',
          `live total ${liveTotal} > max ${config.maxTotalUsdCents}`
        );
      }

      // (3) balance
      const { balanceUsdCents } = await this.getBalance();
      if (balanceUsdCents < liveTotal) {
        throw domainError(
          'PROCUREMENT_INSUFFICIENT_BALANCE',
          `balance ${balanceUsdCents} < live total ${liveTotal}`
        );
      }

      return client.purchase(quantity);
    },

    async fetchDelivered(order) {
      const raw = await client.fetchDelivered(order);
      return importer.importDelivered(raw, { verifiedFormat: config.deliveryFormatVerified });
    }
  };
}
