import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assignCategoryKeys,
  isTypingTarget,
  normalizeToKeyCode,
  RESERVED_CATEGORY_LETTERS,
  type CategoryLike,
} from "../config";
import { matchesCategoryKey, matchesKeyEvent, type KeyEventLike } from "../matcher";

describe("Category Key Auto-Assignment", () => {
  it("assigns first letters when available and non-reserved", () => {
    const categories: CategoryLike[] = [
      { id: "1", name: "Retail" },
      { id: "2", name: "Measurable" },
      { id: "3", name: "Wholesale" },
      { id: "4", name: "Bakery" },
    ];

    const bindings = assignCategoryKeys(categories);
    const map = Object.fromEntries(bindings.map((b) => [b.name, b.code]));

    assert.equal(map["Retail"], "KeyR");
    assert.equal(map["Measurable"], "KeyM");
    assert.equal(map["Wholesale"], "KeyW");
    assert.equal(map["Bakery"], "KeyB");
  });

  it("never assigns reserved letters (A, C, D, N, S)", () => {
    // Categories that start with reserved letters
    const categories: CategoryLike[] = [
      { id: "1", name: "Dairy" }, // 'D' is reserved -> should take 'I', 'R', or 'Y'
      { id: "2", name: "Snacks" }, // 'S' is reserved -> should take 'K' ('A' is also reserved, 'N' is also reserved!)
      { id: "3", name: "Canned Goods" }, // 'C', 'A', 'N' reserved -> should pick 'E' or 'D' (D reserved) -> 'G'
      { id: "4", name: "Apparel" }, // 'A' reserved -> 'P'
    ];

    const bindings = assignCategoryKeys(categories);
    for (const b of bindings) {
      const letter = b.code.replace("Key", "");
      assert.equal(
        RESERVED_CATEGORY_LETTERS.has(letter),
        false,
        `Letter ${letter} for category ${b.name} must not be reserved`,
      );
    }
  });

  it("handles duplicate starting letters by picking subsequent available letters", () => {
    const categories: CategoryLike[] = [
      { id: "1", name: "Beverages" }, // Starts with B -> KeyB
      { id: "2", name: "Bakery" }, // Starts with B -> 'B' taken, 'A' reserved, 'K' available -> KeyK
    ];

    const bindings = assignCategoryKeys(categories);
    const map = Object.fromEntries(bindings.map((b) => [b.name, b.code]));

    assert.equal(map["Beverages"], "KeyB");
    assert.equal(map["Bakery"], "KeyK");
    assert.notEqual(map["Beverages"], map["Bakery"]);
  });

  it("falls back to digits 1-9 when all letters are exhausted or reserved", () => {
    const categories: CategoryLike[] = [
      { id: "1", name: "A C D" }, // All letters reserved!
    ];

    const bindings = assignCategoryKeys(categories);
    assert.equal(bindings.length, 1);
    assert.equal(bindings[0].code, "Digit1");
  });

  it("respects category hotKey extension point and overrides", () => {
    const categories: CategoryLike[] = [
      { id: "1", name: "Custom", hotKey: "KeyZ" },
      { id: "2", name: "Special Override" },
    ];

    const overrides = { "Special Override": "KeyO" };
    const bindings = assignCategoryKeys(categories, overrides);
    const map = Object.fromEntries(bindings.map((b) => [b.name, b.code]));

    assert.equal(map["Custom"], "KeyZ");
    assert.equal(map["Special Override"], "KeyO");
    assert.equal(normalizeToKeyCode("w"), "KeyW");
    assert.equal(normalizeToKeyCode("3"), "Digit3");
  });
});

describe("isTypingTarget guard", () => {
  it("detects input, textarea, and select elements as typing targets", () => {
    const mockInput = {
      tagName: "INPUT",
      type: "text",
      getAttribute: () => null,
      isContentEditable: false,
    };
    const mockTextarea = {
      tagName: "TEXTAREA",
      getAttribute: () => null,
      isContentEditable: false,
    };
    const mockSelect = {
      tagName: "SELECT",
      getAttribute: () => null,
      isContentEditable: false,
    };

    assert.equal(isTypingTarget(mockInput as unknown as EventTarget), true);
    assert.equal(isTypingTarget(mockTextarea as unknown as EventTarget), true);
    assert.equal(isTypingTarget(mockSelect as unknown as EventTarget), true);
  });

  it("identifies contentEditable and combobox/textbox roles as typing targets", () => {
    const mockEditable = {
      tagName: "DIV",
      isContentEditable: true,
      getAttribute: () => null,
    };
    const mockCombobox = {
      tagName: "DIV",
      isContentEditable: false,
      getAttribute: (attr: string) => (attr === "role" ? "combobox" : null),
    };

    assert.equal(isTypingTarget(mockEditable as unknown as EventTarget), true);
    assert.equal(isTypingTarget(mockCombobox as unknown as EventTarget), true);
  });

  it("does not classify non-text inputs or buttons as typing targets", () => {
    const mockBtn = {
      tagName: "BUTTON",
      getAttribute: () => null,
      isContentEditable: false,
    };
    const mockCheckboxInput = {
      tagName: "INPUT",
      type: "checkbox",
      getAttribute: () => null,
      isContentEditable: false,
    };

    assert.equal(isTypingTarget(mockBtn as unknown as EventTarget), false);
    assert.equal(isTypingTarget(mockCheckboxInput as unknown as EventTarget), false);
    assert.equal(isTypingTarget(null), false);
  });
});

describe("Key-matching logic (event.code, modifiers, two layers)", () => {
  it("allows bare key outside input when no dialog is open", () => {
    const event: KeyEventLike = {
      code: "KeyW",
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target: null,
    };

    const res = matchesCategoryKey(event, "KeyW", false);
    assert.equal(res.matches, true);
    assert.equal(res.isAlt, false);
  });

  it("blocks bare key when a dialog is open", () => {
    const event: KeyEventLike = {
      code: "KeyW",
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target: null,
    };

    const res = matchesCategoryKey(event, "KeyW", true);
    assert.equal(res.matches, false);
  });

  it("allows Alt+Key everywhere, even when dialog or input is active", () => {
    const event: KeyEventLike = {
      code: "KeyW",
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target: null,
    };

    const res = matchesCategoryKey(event, "KeyW", true);
    assert.equal(res.matches, true);
    assert.equal(res.isAlt, true);
  });

  it("never triggers category shortcuts when Ctrl or Meta is pressed (preserves copy/paste/refresh)", () => {
    const event: KeyEventLike = {
      code: "KeyW",
      altKey: false,
      ctrlKey: true, // e.g. Ctrl+W (close tab) or Ctrl+C
      metaKey: false,
      shiftKey: false,
      target: null,
    };

    const res = matchesCategoryKey(event, "KeyW", false);
    assert.equal(res.matches, false);
  });

  it("matches by event.code rather than event.key (IME / Sinhala / Tamil compatibility)", () => {
    const event: KeyEventLike = {
      code: "KeyW",
      key: "අ", // Sinhala character on key W
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target: null,
    };

    const res = matchesCategoryKey(event, "KeyW", false);
    assert.equal(res.matches, true);
  });

  it("checks general shortcuts with modifiers correctly", () => {
    const chargeEvent: KeyEventLike = {
      code: "Enter",
      altKey: false,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      target: null,
    };

    assert.equal(
      matchesKeyEvent(chargeEvent, "Enter", { requiresCtrl: true, allowInInput: true }),
      true,
    );

    const normalEnter: KeyEventLike = {
      code: "Enter",
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target: null,
    };

    assert.equal(
      matchesKeyEvent(normalEnter, "Enter", { requiresCtrl: true, allowInInput: true }),
      false,
    );
  });
});
