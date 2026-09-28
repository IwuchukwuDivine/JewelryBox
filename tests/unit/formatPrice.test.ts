import { describe, expect, it } from "vitest";
import {
  formatDeliveryFee,
  formatPrice,
  formatPriceWithUnit,
} from "~/utils/formatPrice";

describe("formatPrice", () => {
  /**
   * Zero is the reason this test exists.
   *
   * A free item, a zero-fee rate and a ₦0 gift card all have to print as
   * "₦0" and not as "", "—" or "Free". `formatPrice` is deliberately
   * unconditional — there is no `if (!price) return ""` — and that absence is
   * the load-bearing part: a falsy guard reads like a tidy-up and silently
   * blanks a real price. Asserting the value locks the behaviour so nobody
   * "simplifies" the function back into a bug.
   */
  it("prints zero as ₦0, never as an empty string", () => {
    expect(formatPrice(0)).toBe("₦0");
    expect(formatPrice(0)).not.toBe("");
  });

  it("groups thousands", () => {
    expect(formatPrice(999)).toBe("₦999");
    expect(formatPrice(1_000)).toBe("₦1,000");
    expect(formatPrice(1_850_000)).toBe("₦1,850,000");
    expect(formatPrice(1_000_000_000)).toBe("₦1,000,000,000");
  });

  it("rounds to whole naira — prices are integers, never kobo", () => {
    expect(formatPrice(1_234.56)).toBe("₦1,235");
    expect(formatPrice(2_500.4)).toBe("₦2,500");
    expect(formatPrice(0.5)).toBe("₦1");
    expect(formatPrice(0.4)).toBe("₦0");
  });
});

describe("formatDeliveryFee", () => {
  it("prints a zero fee as Free", () => {
    expect(formatDeliveryFee(0)).toBe("Free");
  });

  it("prints a positive fee as naira", () => {
    expect(formatDeliveryFee(3_500)).toBe("₦3,500");
    expect(formatDeliveryFee(25_000)).toBe("₦25,000");
  });

  /**
   * The null wording is the caller's, verbatim — and it must stay that way.
   *
   * The temptation is to move the phrase into the formatter "for
   * consistency". It cannot live there, because the difference between the two
   * call sites is tense, not style: on checkout the customer has not ordered
   * yet, so "Quoted after you order" describes what will happen; in an order
   * email they already placed, those same words read as stale, which is why
   * the email says "To be confirmed". A single shared default is therefore
   * actively wrong at one of the two sites. The formatter owns ₦ and "Free";
   * the sentence belongs to whoever is speaking.
   */
  it("returns the caller's phrase for a null fee, unmodified", () => {
    expect(formatDeliveryFee(null, "Quoted after you order")).toBe(
      "Quoted after you order",
    );
    expect(formatDeliveryFee(null, "To be confirmed")).toBe("To be confirmed");
    // Not reformatted, not appended to, not title-cased.
    expect(formatDeliveryFee(null, "we will email you")).toBe(
      "we will email you",
    );
  });

  it("still formats a known fee when the null phrase is supplied", () => {
    expect(formatDeliveryFee(0, "Quoted after you order")).toBe("Free");
    expect(formatDeliveryFee(7_000, "Quoted after you order")).toBe("₦7,000");
  });
});

describe("formatPriceWithUnit", () => {
  it("appends the unit only when there is one", () => {
    expect(formatPriceWithUnit(1_850_000, "piece")).toBe("₦1,850,000/piece");
    expect(formatPriceWithUnit(1_850_000)).toBe("₦1,850,000");
    expect(formatPriceWithUnit(1_850_000, null)).toBe("₦1,850,000");
    expect(formatPriceWithUnit(0, "piece")).toBe("₦0/piece");
  });
});
