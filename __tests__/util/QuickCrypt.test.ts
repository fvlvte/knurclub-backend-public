import {
  QCError,
  QuickCrypt,
  QuickCryptError,
} from "../../src/util/QuickCrypt";
import { randomBytes } from "node:crypto";
test("if input is equal after wrapping cycle", () => {
  const toWrap = "123456abc";
  const wrapped = QuickCrypt.wrap(toWrap);
  const unwrapped = QuickCrypt.unwrap(wrapped);

  expect(unwrapped).toBe(toWrap);
});

test("if `Number` type will be persisted during wrapping cycle", () => {
  const toWrap = 2137;
  const wrapped = QuickCrypt.wrap(toWrap);
  const unwrapped = QuickCrypt.unwrap<number>(wrapped);

  expect(unwrapped).toBe(toWrap);
});

test("if `Buffer` type will be persisted during wrapping cycle", () => {
  const toWrap = Buffer.from("2137", "utf-8");
  const wrapped = QuickCrypt.wrap(toWrap);
  const unwrapped = QuickCrypt.unwrap<Buffer>(wrapped);

  expect(toWrap.compare(unwrapped)).toBe(0);
});

test("if long string unpadded to block size will be handled properly in wrapping cycle", () => {
  const longString =
    "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890";
  const wrapped = QuickCrypt.wrap(longString);
  const unwrapped = QuickCrypt.unwrap<string>(wrapped);
  expect(longString).toBe(unwrapped);
});

test("if plaintext padding in `QuickCrypt.wrap` method works for edge cases", () => {
  const toWrap1 = Buffer.from("12345678901234567890123456789012", "utf-8");
  const toWrap2 = Buffer.from("", "utf-8");

  const wrapped = QuickCrypt.wrap(toWrap1);
  const wrapped2 = QuickCrypt.wrap(toWrap2);

  const cipherText1 = wrapped.split(QuickCrypt.SEPARATOR).pop();
  const cipherText2 = wrapped2.split(QuickCrypt.SEPARATOR).pop();

  if (!cipherText1 || !cipherText2) {
    fail("Bad ciphertext.");
  }

  expect(cipherText1.length).toBe(cipherText2.length);
});

test("if spoofing timestamp in input produces integrity verification error", () => {
  try {
    const wrapped = QuickCrypt.wrap("test");
    const splits = wrapped.split(QuickCrypt.SEPARATOR);
    // index 4 = mac timestamp
    splits[4] = "2137692137";
    QuickCrypt.unwrap(splits.join(QuickCrypt.SEPARATOR));
  } catch (e) {
    if (!(e instanceof QuickCryptError)) {
      fail("Invalid error type.");
    }
    expect(e.name).toBe(QCError.MESSAGE_AUTHENTICATION_FAILURE);
  }
});

test("if random string will trigger proper validation error on `QuickCrypt.unwrap` method", () => {
  try {
    QuickCrypt.unwrap(randomBytes(20).toString("hex"));
  } catch (e) {
    if (!(e instanceof QuickCryptError)) {
      fail("Invalid error type.");
    }
    expect(e.name).toBe(QCError.MALFORMED_INPUT);
  }
});

test("if `QuickCrypt.unwrap` method will properly trigger transcoder error on invalid key provided", () => {
  try {
    QuickCrypt.unwrap(QuickCrypt.wrap("abc", "def"), "qqq");
  } catch (e) {
    if (!(e instanceof QuickCryptError)) {
      fail("Invalid error type.");
    }
    expect(e.name).toBe(QCError.TRANSCODER_FAILURE);
  }
});

test("if malformed version header will trigger proper error on `QuickCrypt.unwrap` method", () => {
  try {
    QuickCrypt.unwrap(QuickCrypt.wrap("test").replace("qc1", "qc2"));
  } catch (e) {
    if (!(e instanceof QuickCryptError)) {
      fail("Invalid error type.");
    }
    expect(e.name).toBe(QCError.INVALID_VERSION_HEADER);
  }
});

test("if `QuickCrypt.typeofWrapped` will properly convert `Buffer` type into plain `object` type", () => {
  expect(
    QuickCrypt.typeofWrapped(QuickCrypt.wrap(Buffer.from("12345", "utf-8"))),
  ).toBe("object");
});

test("if `QuickCrypt.typeofWrapped` will properly recognize plain type of number", () => {
  expect(QuickCrypt.typeofWrapped(QuickCrypt.wrap(12345))).toBe("number");
});
