// @vitest-environment jsdom

// Drives the client form to assert the two behaviors that live only here: the
// +1 payload gate (an inactive +1 sends an empty name regardless of stale typed
// text) and the decline-vs-attending confirmation selection. The network is
// mocked; these tests never touch /api/rsvp.

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RsvpForm, type PartyMemberView } from "./RsvpForm";

const ONE_ELIGIBLE: PartyMemberView[] = [{ guestId: "g001", name: "Ada Lovelace" }];
const COUPLE: PartyMemberView[] = [
  { guestId: "g001", name: "Ada Lovelace" },
  { guestId: "g002", name: "Charles Babbage" },
];

function renderForm(members = ONE_ELIGIBLE, plusOneEligible = true) {
  return render(
    <RsvpForm members={members} plusOneEligible={plusOneEligible} />
  );
}

function attend(name: RegExp) {
  fireEvent.click(screen.getByRole("radio", { name }));
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /send rsvp/i }));
}

function lastPayload(): Record<string, unknown> {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const init = calls.at(-1)?.[1] as RequestInit;
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RsvpForm +1 payload gate", () => {
  it("shows the +1 block before attendance is answered and hides it after a decline", () => {
    renderForm();
    expect(screen.getByText("You have a +1!")).toBeInTheDocument();

    attend(/Can.t make it/);
    expect(screen.queryByText("You have a +1!")).not.toBeInTheDocument();

    attend(/Yes, joining/);
    expect(screen.getByText("You have a +1!")).toBeInTheDocument();
  });

  it("keeps the name field hidden until the guest opts in", () => {
    renderForm();
    expect(
      screen.queryByPlaceholderText("First and last name")
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /bringing a guest/i }));
    expect(
      screen.getByPlaceholderText("First and last name")
    ).toBeInTheDocument();
  });

  it("sends the trimmed +1 name when the guest is bringing one", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("checkbox", { name: /bringing a guest/i }));
    fireEvent.change(screen.getByPlaceholderText("First and last name"), {
      target: { value: "  Grace Hopper  " },
    });
    attend(/Yes, joining/);
    submit();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(lastPayload().plusOneName).toBe("Grace Hopper");
  });

  it("drops a typed +1 name when the toggle is switched back off", async () => {
    renderForm();
    attend(/Yes, joining/);
    fireEvent.click(screen.getByRole("checkbox", { name: /bringing a guest/i }));
    fireEvent.change(screen.getByPlaceholderText("First and last name"), {
      target: { value: "Grace Hopper" },
    });
    // Change of heart: uncheck. The typed text is now stale.
    fireEvent.click(screen.getByRole("checkbox", { name: /bringing a guest/i }));
    submit();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(lastPayload().plusOneName).toBe("");
  });

  it("drops a typed +1 name when attendance flips to no", async () => {
    renderForm();
    attend(/Yes, joining/);
    fireEvent.click(screen.getByRole("checkbox", { name: /bringing a guest/i }));
    fireEvent.change(screen.getByPlaceholderText("First and last name"), {
      target: { value: "Grace Hopper" },
    });
    // Flip to not-attending — the whole +1 block unmounts and its data drops.
    attend(/Can.t make it/);
    submit();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(lastPayload().plusOneName).toBe("");
  });

  it("blocks submit with an inline error when bringing a +1 but no name", async () => {
    renderForm();
    attend(/Yes, joining/);
    fireEvent.click(screen.getByRole("checkbox", { name: /bringing a guest/i }));
    submit();

    expect(
      await screen.findByText(/Please add your guest.s name/)
    ).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("places the +1 block immediately after the primary guest", () => {
    renderForm(COUPLE);

    const primaryBlock = screen.getByText("Ada Lovelace").parentElement;
    const plusOneBlock = screen.getByText("You have a +1!").parentElement;
    const secondMemberBlock = screen.getByText("Charles Babbage").parentElement;

    expect(primaryBlock?.nextElementSibling).toBe(plusOneBlock);
    expect(plusOneBlock?.nextElementSibling).toBe(secondMemberBlock);
  });
});

describe("RsvpForm confirmation selection", () => {
  it("shows the attending confirmation for a Yes", async () => {
    renderForm();
    attend(/Yes, joining/);
    submit();

    expect(await screen.findByText("Thank you!")).toBeInTheDocument();
  });

  it("shows the decline confirmation when every answered member is no", async () => {
    renderForm();
    attend(/Can.t make it/);
    submit();

    expect(await screen.findByText(/We.ll miss you/)).toBeInTheDocument();
  });

  it("shows the attending confirmation for a mixed party (one yes, one no)", async () => {
    renderForm(COUPLE);
    fireEvent.click(
      screen.getAllByRole("radio", { name: /Yes, joining/ })[0]
    );
    fireEvent.click(
      screen.getAllByRole("radio", { name: /Can.t make it/ })[1]
    );
    submit();

    expect(await screen.findByText("Thank you!")).toBeInTheDocument();
  });

  it("shows the attending confirmation when a guest is brought despite no self-answer split", async () => {
    renderForm();
    attend(/Yes, joining/);
    fireEvent.click(screen.getByRole("checkbox", { name: /bringing a guest/i }));
    fireEvent.change(screen.getByPlaceholderText("First and last name"), {
      target: { value: "Grace Hopper" },
    });
    submit();

    expect(await screen.findByText("Thank you!")).toBeInTheDocument();
  });
});

describe("RsvpForm Party member scope", () => {
  it("renders controls only for the unanswered members it receives", () => {
    renderForm([{ guestId: "g002", name: "Charles Babbage" }], false);

    expect(screen.getByText("Charles Babbage")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.getAllByText("Will you attend?")).toHaveLength(1);
  });
});
