// Tests for the POST /api/rsvp handler. Per the PRD: "given valid form data,
// calls Sheets writer with correct payload; given invalid data, returns 400
// without writing."

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetRsvpWriterForTesting,
  __setRsvpWriterForTesting,
  handleRsvpPost,
} from "./rsvp-handler";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  __resetRsvpWriterForTesting();
  vi.restoreAllMocks();
});

describe("handleRsvpPost", () => {
  it("returns 200 and calls the writer with the validated submission", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    __setRsvpWriterForTesting(writer);

    const response = await handleRsvpPost(
      makeRequest({
        fullName: "  Angela Smith  ",
        attending: "yes",
        plusOneName: "  Brooks Smith  ",
        dietaryRestrictions: "  Vegetarian  ",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith({
      fullName: "Angela Smith",
      attending: true,
      plusOneName: "Brooks Smith",
      dietaryRestrictions: "Vegetarian",
    });
  });

  it("clears plus-one name when the guest is not attending", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    __setRsvpWriterForTesting(writer);

    const response = await handleRsvpPost(
      makeRequest({
        fullName: "Angela Smith",
        attending: "no",
        plusOneName: "Brooks Smith",
        dietaryRestrictions: "",
      })
    );

    expect(response.status).toBe(200);
    expect(writer).toHaveBeenCalledWith({
      fullName: "Angela Smith",
      attending: false,
      plusOneName: "",
      dietaryRestrictions: "",
    });
  });

  it("returns 400 and does not call the writer when fullName is missing", async () => {
    const writer = vi.fn();
    __setRsvpWriterForTesting(writer);

    const response = await handleRsvpPost(
      makeRequest({
        fullName: "   ",
        attending: "yes",
        plusOneName: "",
        dietaryRestrictions: "",
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.errors).toMatchObject({ fullName: expect.any(String) });
    expect(writer).not.toHaveBeenCalled();
  });

  it("returns 400 and does not call the writer when attending is unspecified", async () => {
    const writer = vi.fn();
    __setRsvpWriterForTesting(writer);

    const response = await handleRsvpPost(
      makeRequest({
        fullName: "Angela Smith",
        attending: "",
        plusOneName: "",
        dietaryRestrictions: "",
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors).toMatchObject({ attending: expect.any(String) });
    expect(writer).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is not valid JSON, without calling the writer", async () => {
    const writer = vi.fn();
    __setRsvpWriterForTesting(writer);

    const response = await handleRsvpPost(
      new Request("http://localhost/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json{",
      })
    );

    expect(response.status).toBe(400);
    expect(writer).not.toHaveBeenCalled();
  });

  it("returns 500 with a generic message when the writer throws", async () => {
    const writer = vi.fn().mockRejectedValue(new Error("Sheets append failed"));
    __setRsvpWriterForTesting(writer);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await handleRsvpPost(
      makeRequest({
        fullName: "Angela Smith",
        attending: "yes",
        plusOneName: "",
        dietaryRestrictions: "",
      })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/try again/i);
    // The internal error message must NOT leak to the client.
    expect(JSON.stringify(body)).not.toContain("Sheets append failed");
  });
});
