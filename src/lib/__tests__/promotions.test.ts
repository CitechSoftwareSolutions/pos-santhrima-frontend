import { test, describe } from "node:test";
import assert from "node:assert";
import { evaluatePromotion, describePromotion } from "../promotion-utils";
import { PromotionType, type PromotionSummaryDto } from "../types";

describe("evaluatePromotion", () => {
  test("Buy 3 Get 1 Free criteria met with 3 units", () => {
    const promo: PromotionSummaryDto = {
      id: "p1",
      name: "Buy 3 Get 1 Free",
      description: "Weekend special offer",
      type: PromotionType.BuyXGetYFree,
      buyQuantity: 3,
      freeQuantity: 1,
      minQuantity: null,
      discountPercent: null,
      bundleQuantity: null,
      bundlePrice: null,
    };

    const res = evaluatePromotion(promo, "Fresh Milk 1L", 3, 400);
    assert.strictEqual(res.isMet, true);
    assert.strictEqual(res.freeQuantity, 1);
    assert.strictEqual(res.discountAmount, 400);
    assert.strictEqual(
      res.message,
      "Give 1 free Fresh Milk 1L under the Buy 3 Get 1 Free - Weekend special offer"
    );
    // Verify NO emojis in message
    assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(res.message));
  });

  test("Buy 3 Get 1 Free with 6 units gives 2 free", () => {
    const promo: PromotionSummaryDto = {
      id: "p1",
      name: "Buy 3 Get 1 Free",
      description: null,
      type: PromotionType.BuyXGetYFree,
      buyQuantity: 3,
      freeQuantity: 1,
      minQuantity: null,
      discountPercent: null,
      bundleQuantity: null,
      bundlePrice: null,
    };

    const res = evaluatePromotion(promo, "Soap Bar", 6, 150);
    assert.strictEqual(res.isMet, true);
    assert.strictEqual(res.freeQuantity, 2);
    assert.strictEqual(res.discountAmount, 300);
    assert.strictEqual(res.message, "Give 2 free Soap Bar under the Buy 3 Get 1 Free");
  });

  test("Buy 3 Get 1 Free criteria NOT met with 2 units", () => {
    const promo: PromotionSummaryDto = {
      id: "p1",
      name: "Buy 3 Get 1 Free",
      description: "Weekend special",
      type: PromotionType.BuyXGetYFree,
      buyQuantity: 3,
      freeQuantity: 1,
      minQuantity: null,
      discountPercent: null,
      bundleQuantity: null,
      bundlePrice: null,
    };

    const res = evaluatePromotion(promo, "Fresh Milk 1L", 2, 400);
    assert.strictEqual(res.isMet, false);
    assert.strictEqual(res.freeQuantity, 0);
  });

  test("Bulk percent off criteria met and calculated", () => {
    const promo: PromotionSummaryDto = {
      id: "p2",
      name: "Bulk 10% Off",
      description: "Buy 5 or more get 10% off",
      type: PromotionType.BulkPercentOff,
      buyQuantity: null,
      freeQuantity: null,
      minQuantity: 5,
      discountPercent: 10,
      bundleQuantity: null,
      bundlePrice: null,
    };

    const res = evaluatePromotion(promo, "Rice 5kg", 5, 1000);
    assert.strictEqual(res.isMet, true);
    assert.strictEqual(res.freeQuantity, 0);
    assert.strictEqual(res.discountAmount, 500); // 5 * 1000 * 10%
  });

  test("Fixed price bundle criteria met and calculated", () => {
    const promo: PromotionSummaryDto = {
      id: "p3",
      name: "3 for Rs. 1000",
      description: "Bundle deal",
      type: PromotionType.FixedPriceBundle,
      buyQuantity: null,
      freeQuantity: null,
      minQuantity: null,
      discountPercent: null,
      bundleQuantity: 3,
      bundlePrice: 1000,
    };

    // Normal price: 400 * 3 = 1200. Bundle: 1000. Discount = 200.
    const res = evaluatePromotion(promo, "Cooking Oil 1L", 3, 400);
    assert.strictEqual(res.isMet, true);
    assert.strictEqual(res.freeQuantity, 0);
    assert.strictEqual(res.discountAmount, 200);
  });
});
